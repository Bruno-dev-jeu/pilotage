// Calcul des échéances du Pilotage (CDC chapitre 4), commun à l'application
// (window.Echeances) et au serveur (pb_hooks, par require()). Le même fichier
// est envoyé dans /var/www/pilotage-bmlab/ et dans /opt/pocketbase-pilotage/pb_hooks/.
//
// Toutes les dates sont des textes « AAAA-MM-JJ » (jour civil, sans heure) ;
// une date PocketBase (« 2026-11-15 00:00:00.000Z ») est ramenée à ses
// 10 premiers caractères. « Aujourd'hui » est toujours le jour à Paris.
//
// Une tâche est un objet simple (champs de la collection « taches ») :
//   mode : « apres » (intervalle après la dernière réalisation), « fixe »
//   (dates du calendrier : « 15/01, 15/04 » chaque année, « 01 » chaque mois)
//   ou « unique » ; souplesse « imperative » ou « souple » (± tolerance
//   jours) ; preparation / preparation_jours / preparation_faite ; etat
//   « active », « attente » ou « terminee ».
(function (racine, fabrique) {
  var m = fabrique();
  if (typeof module === "object" && module && module.exports) module.exports = m;
  else racine.Echeances = m;
})(this, function () {
  "use strict";

  var MS_JOUR = 86400000;

  function deux(n) {
    return (n < 10 ? "0" : "") + n;
  }

  function jour(s) {
    s = s ? String(s) : "";
    return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : "";
  }

  function versMs(s) {
    var p = s.split("-");
    return Date.UTC(+p[0], +p[1] - 1, +p[2]);
  }

  function versTexte(ms) {
    var d = new Date(ms);
    return d.getUTCFullYear() + "-" + deux(d.getUTCMonth() + 1) + "-" + deux(d.getUTCDate());
  }

  function ajouterJours(s, n) {
    return versTexte(versMs(s) + n * MS_JOUR);
  }

  // Nombre de jours de a à b (positif si b est après a).
  function ecart(a, b) {
    return Math.round((versMs(b) - versMs(a)) / MS_JOUR);
  }

  function finDeMois(annee, mois0) {
    return new Date(Date.UTC(annee, mois0 + 1, 0)).getUTCDate();
  }

  // Ajoute n mois ; le 31 devient le dernier jour du mois s'il est plus court.
  function ajouterMois(s, n) {
    var p = s.split("-");
    var total = (+p[1] - 1) + n;
    var annee = +p[0] + Math.floor(total / 12);
    var mois0 = ((total % 12) + 12) % 12;
    var j = Math.min(+p[2], finDeMois(annee, mois0));
    return annee + "-" + deux(mois0 + 1) + "-" + deux(j);
  }

  function ajouter(s, n, unite) {
    if (unite === "jours") return ajouterJours(s, n);
    if (unite === "semaines") return ajouterJours(s, 7 * n);
    if (unite === "ans") return ajouterMois(s, 12 * n);
    return ajouterMois(s, n);
  }

  function plusTard(a, b) {
    return a > b ? a : b;
  }

  // « 15/01, 15/04 » → [{ j: 15, m: 1 }, …] ; « 01 » → { j: 1, m: 0 } (chaque
  // mois). Rend null si un morceau est illisible.
  function lireDatesFixes(texte) {
    var res = [];
    var morceaux = String(texte || "").split(/[,;]/);
    for (var i = 0; i < morceaux.length; i++) {
      var m = morceaux[i].trim();
      if (!m) continue;
      var r = m.match(/^(\d{1,2})(?:\/(\d{1,2}))?$/);
      if (!r) return null;
      var j = +r[1];
      var mo = r[2] ? +r[2] : 0;
      if (j < 1 || j > 31 || mo > 12) return null;
      res.push({ j: j, m: mo });
    }
    return res.length ? res : null;
  }

  // Première date de la liste strictement après « base ».
  function dateFixeApres(liste, base) {
    var annee = +base.slice(0, 4);
    var meilleure = "";
    for (var a = annee; a <= annee + 1; a++) {
      for (var i = 0; i < liste.length; i++) {
        var mois = liste[i].m ? [liste[i].m] : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
        for (var k = 0; k < mois.length; k++) {
          var j = Math.min(liste[i].j, finDeMois(a, mois[k] - 1));
          var d = a + "-" + deux(mois[k]) + "-" + deux(j);
          if (d > base && (!meilleure || d < meilleure)) meilleure = d;
        }
      }
    }
    return meilleure;
  }

  function tolerance(t) {
    if (t.souplesse === "imperative") return 0;
    var n = parseInt(t.tolerance, 10);
    return isNaN(n) || n < 0 ? 0 : n;
  }

  // Tâche d'au moins un an entre deux échéances : premier rappel à J-30.
  function periodeLongue(t) {
    var n = parseInt(t.intervalle, 10) || 0;
    if (t.mode === "apres") {
      return t.unite === "ans" ? n >= 1 : t.unite === "mois" ? n >= 12 : t.unite === "semaines" ? n >= 52 : n >= 365;
    }
    if (t.mode === "fixe") {
      var l = lireDatesFixes(t.dates_fixes);
      return !!(l && l.length === 1 && l[0].m);
    }
    return false;
  }

  // Règles de rappel par priorité (CDC 4.5), réglables par le propriétaire
  // (collection « reglages », champ « regles ») :
  //   retard : rappel en retard tous les N jours (0 = seulement le lundi) ;
  //   matin : jour J et premier rappel dans l'e-mail du matin (sinon lundi).
  var REGLES_DEFAUT = {
    critique: { retard: 1, matin: true },
    important: { retard: 3, matin: true },
    confort: { retard: 0, matin: false },
    avance: 7,
    avance_annuelle: 30,
    tolerance: 7,
  };

  function entier(v, defaut, min, max) {
    var n = parseInt(v, 10);
    if (isNaN(n)) return defaut;
    return Math.max(min, Math.min(max, n));
  }

  // Règles enregistrées, complétées et bornées (une valeur absente ou
  // aberrante reprend la valeur par défaut).
  function regles(r) {
    r = r && typeof r === "object" ? r : {};
    var res = {};
    ["critique", "important", "confort"].forEach(function (p) {
      var d = REGLES_DEFAUT[p];
      var x = r[p] && typeof r[p] === "object" ? r[p] : {};
      res[p] = { retard: entier(x.retard, d.retard, 0, 30), matin: typeof x.matin === "boolean" ? x.matin : d.matin };
    });
    res.avance = entier(r.avance, REGLES_DEFAUT.avance, 1, 365);
    res.avance_annuelle = entier(r.avance_annuelle, REGLES_DEFAUT.avance_annuelle, 1, 365);
    res.tolerance = entier(r.tolerance, REGLES_DEFAUT.tolerance, 0, 365);
    return res;
  }

  // Jours d'avance du premier rappel (CDC 4.5) : réglage de la tâche, sinon
  // règle générale (30 jours pour une tâche annuelle ou plus, 7 sinon).
  function avance(t, R) {
    R = R || REGLES_DEFAUT;
    var n = parseInt(t.rappel_jours, 10);
    if (n > 0) return n;
    return periodeLongue(t) ? R.avance_annuelle : R.avance;
  }

  // Prochaine échéance après une réalisation à la date « fait ».
  // Rend "" pour une tâche unique (elle est alors terminée).
  function prochaine(t, fait) {
    if (t.mode === "reference") return "";
    var n = parseInt(t.intervalle, 10) || 0;
    if (t.mode === "apres" && n > 0) return ajouter(fait, n, t.unite || "mois");
    if (t.mode === "fixe") {
      var l = lireDatesFixes(t.dates_fixes);
      if (!l) return "";
      // Faite en avance dans sa fenêtre (ex. pergola visée le 01/11, faite le
      // 25/10) : la suivante est celle d'après la fenêtre, pas la même.
      var e = jour(t.echeance);
      var base = e ? plusTard(fait, ajouterJours(e, tolerance(t))) : fait;
      return dateFixeApres(l, base);
    }
    return "";
  }

  // Éléments d'une tâche pour un jour donné : la tâche elle-même (ou son
  // attente, ou « à compléter ») et sa préparation quand elle est due.
  //   ref : date à partir de laquelle on s'en occupe (début de la tolérance)
  //   fin : dernier jour avant le retard
  function elements(t, auj) {
    // Fiche de référence (CDC 3.6) : jamais d'échéance ni de rappel.
    if (t.etat === "terminee" || t.mode === "reference") return [];
    if (t.etat === "attente") {
      var r = jour(t.attente_relance);
      return [{ type: "attente", tache: t, ref: r, fin: r, cible: r }];
    }
    var e = jour(t.echeance);
    if (!e) return [{ type: "a_completer", tache: t }];
    var tol = tolerance(t);
    var liste = [{ type: "tache", tache: t, cible: e, ref: ajouterJours(e, -tol), fin: ajouterJours(e, tol) }];
    var pj = parseInt(t.preparation_jours, 10) || 0;
    if (t.preparation && pj > 0 && !t.preparation_faite) {
      var dp = ajouterJours(e, -pj);
      if (auj >= dp) liste.unshift({ type: "preparation", tache: t, cible: dp, ref: dp, fin: dp });
    }
    return liste;
  }

  // Rangement d'un élément : retard, semaine, mois, plus_tard, attente,
  // a_completer. Ajoute « jours » (avant la date, ou de retard).
  function classer(el, auj) {
    if (el.type === "a_completer") return "a_completer";
    if (el.type === "attente" && !el.fin) return "attente";
    var apresFin = ecart(el.fin, auj);
    if (apresFin > 0) {
      el.jours = apresFin;
      return "retard";
    }
    if (el.type === "attente") return "attente";
    var avant = ecart(auj, el.ref);
    el.jours = avant;
    if (avant <= 7) return "semaine";
    if (avant <= 31) return "mois";
    return "plus_tard";
  }

  var RANG_PRIORITE = { critique: 0, important: 1, confort: 2 };

  // Tableau de bord : éléments rangés et compteurs, triés (retard le plus
  // ancien d'abord, puis date, puis priorité).
  function tableau(taches, auj) {
    var groupes = { retard: [], semaine: [], mois: [], plus_tard: [], attente: [], a_completer: [] };
    taches.forEach(function (t) {
      elements(t, auj).forEach(function (el) {
        el.groupe = classer(el, auj);
        groupes[el.groupe].push(el);
      });
    });
    function tri(a, b) {
      var da = a.ref || "9999";
      var db = b.ref || "9999";
      if (da !== db) return da < db ? -1 : 1;
      return (RANG_PRIORITE[a.tache.priorite] || 0) - (RANG_PRIORITE[b.tache.priorite] || 0);
    }
    Object.keys(groupes).forEach(function (k) {
      groupes[k].sort(k === "a_completer" ? function (a, b) { return a.tache.titre < b.tache.titre ? -1 : 1; } : tri);
    });
    groupes.compteurs = { retard: groupes.retard.length, semaine: groupes.semaine.length, mois: groupes.mois.length };
    return groupes;
  }

  // Choix du contenu de l'e-mail du matin (CDC 4.5 et 6), selon les règles
  // de chaque priorité ; le lundi (résumé), tous les retards. Rend aussi les
  // tâches dont le premier rappel part ce jour (champ rappel_envoye).
  function courriel(taches, auj, lundi, R) {
    R = regles(R);
    var res = { retard: [], aujourdhui: [], bientot: [], aMarquer: [] };
    taches.forEach(function (t) {
      var p = R[t.priorite] || R.important;
      elements(t, auj).forEach(function (el) {
        var g = classer(el, auj);
        if (g === "a_completer") return;
        if (g === "retard") {
          if (lundi || (p.retard > 0 && (el.jours - 1) % p.retard === 0)) res.retard.push(el);
          return;
        }
        if (!p.matin) return;
        if (el.ref && el.ref === auj) {
          res.aujourdhui.push(el);
          if (el.type === "tache") res.aMarquer.push(t);
          return;
        }
        if (el.type === "tache" && auj < el.ref && auj >= ajouterJours(el.ref, -avance(t, R)) && jour(t.rappel_envoye) !== el.cible) {
          res.bientot.push(el);
          res.aMarquer.push(t);
        }
      });
    });
    function tri(a, b) {
      return (a.ref || "") < (b.ref || "") ? -1 : (a.ref || "") > (b.ref || "") ? 1 : 0;
    }
    res.retard.sort(function (a, b) {
      var p = (RANG_PRIORITE[a.tache.priorite] || 0) - (RANG_PRIORITE[b.tache.priorite] || 0);
      return p || tri(a, b);
    });
    res.bientot.sort(tri);
    return res;
  }

  // Dates d'une tâche entre « de » et « a » (inclus), pour le calendrier :
  // l'échéance en cours, ses suivantes prévues, et la préparation en cours.
  function occurrences(t, de, a) {
    var res = [];
    if (t.etat === "terminee" || t.mode === "reference") return res;
    if (t.etat === "attente") {
      var r = jour(t.attente_relance);
      if (r && r >= de && r <= a) res.push({ date: r, type: "attente" });
      return res;
    }
    var e = jour(t.echeance);
    if (!e) return res;
    var pj = parseInt(t.preparation_jours, 10) || 0;
    if (t.preparation && pj > 0 && !t.preparation_faite) {
      var dp = ajouterJours(e, -pj);
      if (dp >= de && dp <= a) res.push({ date: dp, type: "preparation" });
    }
    var d = e;
    var n = parseInt(t.intervalle, 10) || 0;
    var liste = t.mode === "fixe" ? lireDatesFixes(t.dates_fixes) : null;
    for (var i = 0; i < 400 && d && d <= a; i++) {
      if (d >= de) res.push({ date: d, type: i === 0 ? "tache" : "prevue" });
      if (t.mode === "apres" && n > 0) d = ajouter(d, n, t.unite || "mois");
      else if (liste) d = dateFixeApres(liste, d);
      else break;
    }
    return res;
  }

  // Heure de Paris sans base de fuseaux : heure d'été du dernier dimanche
  // de mars, 1 h UTC, au dernier dimanche d'octobre, 1 h UTC.
  function dernierDimanche(annee, mois0) {
    var d = new Date(Date.UTC(annee, mois0 + 1, 0, 1));
    return d.getTime() - d.getUTCDay() * MS_JOUR;
  }

  function paris(ms) {
    var annee = new Date(ms).getUTCFullYear();
    var ete = ms >= dernierDimanche(annee, 2) && ms < dernierDimanche(annee, 9);
    var local = new Date(ms + (ete ? 2 : 1) * 3600000);
    return { date: versTexte(local.getTime()), heure: local.getUTCHours(), jourSemaine: local.getUTCDay() };
  }

  function aujourdhui() {
    return paris(Date.now()).date;
  }

  // « 15/11/2026 » ; « 15/11 » si court.
  function format(s, court) {
    s = jour(s);
    if (!s) return "";
    var p = s.split("-");
    return p[2] + "/" + p[1] + (court ? "" : "/" + p[0]);
  }

  function pluriel(n, mot) {
    return n + " " + mot + (n > 1 ? "s" : "");
  }

  // Texte court de l'échéance d'un élément (liste, e-mail).
  function libelle(el, auj) {
    var t = el.tache;
    if (el.type === "a_completer") return "date à compléter";
    if (el.type === "attente") {
      if (!el.fin) return "en attente, sans date de relance";
      var dr = ecart(auj, el.fin);
      if (dr < 0) return "relance en retard de " + pluriel(-dr, "jour");
      return dr === 0 ? "relancer aujourd'hui" : "relance le " + format(el.fin) + " (dans " + pluriel(dr, "jour") + ")";
    }
    var retard = ecart(el.fin, auj);
    var tol = tolerance(t);
    var vise = el.type === "preparation"
      ? "à faire depuis le " + format(el.cible)
      : tol > 0 ? "vers le " + format(el.cible) + " (± " + tol + " j)" : "avant le " + format(el.cible);
    if (el.type === "preparation") {
      var dp = ecart(auj, el.cible);
      if (dp < 0) return "à faire depuis le " + format(el.cible) + " (" + pluriel(-dp, "jour") + ")";
      return "à faire aujourd'hui";
    }
    if (retard > 0) return "en retard de " + pluriel(retard, "jour") + " · " + vise;
    var avant = ecart(auj, el.cible);
    if (tol > 0 && auj >= el.ref) return "à faire maintenant · " + vise;
    if (avant === 0) return "aujourd'hui";
    return vise + " · dans " + pluriel(avant, "jour");
  }

  return {
    jour: jour,
    ajouterJours: ajouterJours,
    ajouterMois: ajouterMois,
    ajouter: ajouter,
    ecart: ecart,
    lireDatesFixes: lireDatesFixes,
    dateFixeApres: dateFixeApres,
    tolerance: tolerance,
    avance: avance,
    REGLES_DEFAUT: REGLES_DEFAUT,
    regles: regles,
    prochaine: prochaine,
    elements: elements,
    classer: classer,
    tableau: tableau,
    courriel: courriel,
    occurrences: occurrences,
    paris: paris,
    aujourdhui: aujourdhui,
    format: format,
    libelle: libelle,
  };
});
