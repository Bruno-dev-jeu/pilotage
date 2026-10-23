// Outils communs des écrans du Pilotage (window.O) : fabrication du DOM,
// messages, navigation, données gardées pendant la session (domaines,
// tâches), réduction des photos. Tout texte venant de la base est inséré
// avec textContent (jamais innerHTML).
(function () {
  "use strict";

  var E = window.Echeances;
  var cache = { domaines: null, taches: null };

  function el(balise, attributs, enfants) {
    var n = document.createElement(balise);
    Object.keys(attributs || {}).forEach(function (k) {
      var v = attributs[k];
      if (k === "texte") n.textContent = v;
      else if (k === "classe") n.className = v;
      else if (k.indexOf("on") === 0) n.addEventListener(k.slice(2), v);
      // Style posé par le CSSOM : un attribut style serait bloqué par la CSP.
      else if (k === "style") n.style.cssText = v;
      else if (k === "valeur") n.value = v === null || v === undefined ? "" : v;
      else if (k === "coche") n.checked = !!v;
      else if (v !== null && v !== undefined && v !== false) n.setAttribute(k, v);
    });
    (enfants || []).forEach(function (e) {
      if (e === null || e === undefined || e === false) return;
      n.appendChild(typeof e === "string" ? document.createTextNode(e) : e);
    });
    return n;
  }

  function vider(n) {
    while (n.firstChild) n.removeChild(n.firstChild);
  }

  function attente(texte) {
    return el("p", { classe: "attente", role: "status", texte: texte || "Chargement…" });
  }

  function erreur(e) {
    if (e && e.statut === 401) return el("p", { classe: "message", texte: "Session expirée, reconnectez-vous." });
    return el("p", { classe: "message", role: "alert", texte: "Impossible de charger : " + ((e && e.message) || "erreur inconnue") });
  }

  var compteur = 0;
  // Champ de formulaire : étiquette, élément de saisie, aide facultative.
  function champ(etiquette, saisie, aide) {
    if (!saisie.id) saisie.id = "champ-" + (++compteur);
    return el("div", { classe: "champ" }, [
      el("label", { "for": saisie.id, texte: etiquette }),
      saisie,
      aide ? el("p", { classe: "aide", texte: aide }) : null,
    ]);
  }

  function choix(valeurs, valeur) {
    var s = el("select", {});
    valeurs.forEach(function (v) {
      var o = el("option", { value: v[0], texte: v[1] });
      if (String(v[0]) === String(valeur === null || valeur === undefined ? "" : valeur)) o.selected = true;
      s.appendChild(o);
    });
    return s;
  }

  function lireAncre() {
    var h = window.location.hash.replace(/^#\/?/, "");
    var i = h.indexOf("?");
    var chemin = i < 0 ? h : h.slice(0, i);
    var params = {};
    if (i >= 0) {
      h.slice(i + 1).split("&").forEach(function (paire) {
        var kv = paire.split("=");
        if (kv[0]) params[decodeURIComponent(kv[0])] = decodeURIComponent((kv[1] || "").replace(/\+/g, " "));
      });
    }
    return { chemin: chemin.split("/"), params: params };
  }

  function ancre(chemin, params) {
    var q = Object.keys(params || {}).filter(function (k) { return params[k]; }).map(function (k) {
      return encodeURIComponent(k) + "=" + encodeURIComponent(params[k]);
    });
    return "#/" + chemin + (q.length ? "?" + q.join("&") : "");
  }

  // Date « AAAA-MM-JJ » → valeur PocketBase.
  function dateBase(s) {
    s = E.jour(s);
    return s ? s + " 00:00:00.000Z" : "";
  }

  function dateLongue(s) {
    s = E.jour(s);
    if (!s) return "";
    var p = s.split("-");
    return new Date(+p[0], +p[1] - 1, +p[2]).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  }

  var PASTILLE = { critique: "🔴", important: "🟠", confort: "⚪" };
  var PRIORITES = [["critique", "🔴 Critique"], ["important", "🟠 Important"], ["confort", "⚪ Confort"]];

  // ---------- données gardées pendant la session ----------

  function domaines(forcer) {
    if (cache.domaines && !forcer) return Promise.resolve(cache.domaines);
    return Api.tout("domaines", { sort: "ordre,nom" }).then(function (l) {
      cache.domaines = l;
      return l;
    });
  }

  function taches(forcer) {
    if (cache.taches && !forcer) return Promise.resolve(cache.taches);
    return Api.tout("taches", { sort: "titre" }).then(function (l) {
      cache.taches = l;
      return l;
    });
  }

  function oublier() {
    cache.taches = null;
  }

  function oublierTout() {
    cache.taches = null;
    cache.domaines = null;
  }

  function domaineParId(id) {
    var l = cache.domaines || [];
    for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i];
    return null;
  }

  // « 🚙 Voitures › 🚗 VW Eos d'Agnès »
  function nomDomaine(id, court) {
    var d = domaineParId(id);
    if (!d) return "";
    var nom = (d.emoji ? d.emoji + " " : "") + d.nom;
    if (court || !d.parent) return nom;
    var p = domaineParId(d.parent);
    return p ? (p.emoji ? p.emoji + " " : "") + p.nom + " › " + nom : nom;
  }

  // Domaines dans l'ordre d'affichage, avec leur profondeur.
  function arbre() {
    var l = cache.domaines || [];
    var res = [];
    function ajouter(parent, profondeur) {
      l.filter(function (d) { return (d.parent || "") === parent; }).forEach(function (d) {
        res.push({ domaine: d, profondeur: profondeur });
        if (profondeur < 4) ajouter(d.id, profondeur + 1);
      });
    }
    ajouter("", 0);
    return res;
  }

  // Le domaine et tous ses sous-domaines.
  function descendants(id) {
    var res = {};
    res[id] = true;
    var l = cache.domaines || [];
    var change = true;
    while (change) {
      change = false;
      l.forEach(function (d) {
        if (d.parent && res[d.parent] && !res[d.id]) {
          res[d.id] = true;
          change = true;
        }
      });
    }
    return res;
  }

  function choixDomaine(valeur, avecTous) {
    var valeurs = avecTous ? [["", "Tous les domaines"]] : [];
    arbre().forEach(function (a) {
      valeurs.push([a.domaine.id, new Array(a.profondeur + 1).join("\u00a0\u00a0\u00a0\u00a0") + (a.domaine.emoji ? a.domaine.emoji + " " : "") + a.domaine.nom]);
    });
    return choix(valeurs, valeur);
  }

  // Filtre de domaine, gardé sur l'appareil (commodité).
  function filtre(v) {
    try {
      if (v === undefined) return window.localStorage.getItem("pilotage.filtre") || "";
      window.localStorage.setItem("pilotage.filtre", v);
    } catch (e) {
      // stockage indisponible
    }
    return v || "";
  }

  // Texte de la fréquence d'une tâche.
  function frequence(t) {
    var n = parseInt(t.intervalle, 10) || 0;
    if (t.mode === "unique") return "Une seule fois";
    if (t.mode === "apres") {
      var u = { jours: "jour", semaines: "semaine", mois: "mois", ans: "an" }[t.unite] || "mois";
      var unite = n > 1 && u !== "mois" ? u + "s" : u;
      return n === 1 ? "Chaque " + (u === "an" ? "année" : u) + " après la dernière fois" : "Tous les " + n + " " + unite + " après la dernière fois";
    }
    var l = E.lireDatesFixes(t.dates_fixes);
    if (!l) return "Dates du calendrier à préciser";
    var mensuel = l.filter(function (d) { return !d.m; }).map(function (d) { return "le " + d.j + " de chaque mois"; });
    var annuel = l.filter(function (d) { return d.m; }).map(function (d) { return (d.j < 10 ? "0" : "") + d.j + "/" + (d.m < 10 ? "0" : "") + d.m; });
    return mensuel.concat(annuel.length ? ["chaque année le " + annuel.join(", ")] : []).join(" ; ").replace(/^./, function (c) { return c.toUpperCase(); });
  }

  function souplesse(t) {
    return t.souplesse === "imperative" ? "🔒 Date impérative" : "Souple, ± " + (parseInt(t.tolerance, 10) || 0) + " jours";
  }

  // ---------- photos ----------

  // Photo réduite : 1600 px au plus sur le grand côté, JPEG, environ 300 Ko.
  function photoReduite(fichier) {
    return new Promise(function (ok, ko) {
      var url = URL.createObjectURL(fichier);
      var img = new Image();
      img.onload = function () {
        var max = 1600;
        var r = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        var toile = document.createElement("canvas");
        toile.width = Math.round(img.naturalWidth * r);
        toile.height = Math.round(img.naturalHeight * r);
        toile.getContext("2d").drawImage(img, 0, 0, toile.width, toile.height);
        URL.revokeObjectURL(url);
        function essai(qualite) {
          toile.toBlob(function (b) {
            if (!b) return ko(new Error("Photo illisible"));
            if (b.size > 400000 && qualite > 0.5) return essai(qualite - 0.15);
            ok(b);
          }, "image/jpeg", qualite);
        }
        essai(0.82);
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        ko(new Error("Cette photo n'a pas pu être lue."));
      };
      img.src = url;
    });
  }

  function nomFichier(prefixe, ext) {
    return prefixe + "-" + new Date().toISOString().slice(0, 19).replace(/[-:T]/g, "") + "." + ext;
  }

  function taille(o) {
    if (o > 1e6) return (o / 1e6).toFixed(o > 1e8 ? 0 : 1).replace(".", ",") + " Mo";
    return Math.max(1, Math.round(o / 1e3)) + " Ko";
  }

  window.O = {
    el: el,
    vider: vider,
    attente: attente,
    erreur: erreur,
    champ: champ,
    choix: choix,
    lireAncre: lireAncre,
    ancre: ancre,
    dateBase: dateBase,
    dateLongue: dateLongue,
    PASTILLE: PASTILLE,
    PRIORITES: PRIORITES,
    domaines: domaines,
    taches: taches,
    oublier: oublier,
    oublierTout: oublierTout,
    domaineParId: domaineParId,
    nomDomaine: nomDomaine,
    arbre: arbre,
    descendants: descendants,
    choixDomaine: choixDomaine,
    filtre: filtre,
    frequence: frequence,
    souplesse: souplesse,
    photoReduite: photoReduite,
    nomFichier: nomFichier,
    taille: taille,
    // Posés par app.js : titre de l'écran, fermeture d'un écran ouvert par-dessus.
    titre: function () {},
    fermer: function () {},
  };
})();
