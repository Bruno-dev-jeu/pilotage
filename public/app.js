// Application Pilotage : connexion (mot de passe puis code reçu par
// e-mail), navigation, accueil « Aujourd'hui » et calendrier (CDC 3.1, 3.2).
// Les autres écrans sont dans fiche.js, editeur.js et reglages.js.
// Navigation par l'ancre de l'adresse : #/accueil, #/calendrier?m=2026-11,
// #/fiches, #/tache/ID, #/modifier/ID, #/nouvelle, #/procedure/ID, #/reglages.
(function () {
  "use strict";

  var E = window.Echeances;
  var el = O.el;
  var vue = document.getElementById("vue");
  var titre = document.getElementById("titre");
  var pile = [];
  var courante = null;
  var compteur = 0;

  O.titre = function (t) {
    titre.textContent = t;
    document.title = t === "Pilotage" ? "Pilotage" : t + " · Pilotage";
  };
  // Écran ouvert par-dessus : « ✕ Fermer » revient à l'écran d'avant.
  var enRetour = false;
  O.fermer = function (repli) {
    var cible = pile.length ? pile.pop() : repli || "#/accueil";
    enRetour = true;
    if (window.location.hash === cible) router();
    else window.location.hash = cible;
  };
  // Aller à un écran en remplaçant l'écran courant (après un enregistrement
  // ou une suppression) : « ✕ Fermer » ne ramène pas au formulaire.
  O.remplacer = function (cible) {
    enRetour = true;
    if (window.location.hash === cible) router();
    else window.location.hash = cible;
  };
  O.barreFermer = function (repli) {
    return el("div", { classe: "barre-fermer" }, [
      el("button", { type: "button", classe: "bouton secondaire petit", texte: "✕ Fermer", "aria-label": "Fermer et revenir à l'écran précédent", onclick: function () { O.fermer(repli); } }),
    ]);
  };

  // ---------- connexion ----------

  var etapeCode = null;

  function montrerConnexion(message) {
    document.getElementById("appli").hidden = true;
    document.getElementById("connexion").hidden = false;
    var m = document.getElementById("connexion-message");
    m.textContent = message || "";
    m.hidden = !message;
    etapeCode = null;
    document.getElementById("formulaire-connexion").hidden = false;
    document.getElementById("formulaire-code").hidden = true;
  }

  function montrerAppli() {
    document.getElementById("connexion").hidden = true;
    document.getElementById("appli").hidden = false;
    router();
  }

  document.getElementById("formulaire-connexion").addEventListener("submit", function (ev) {
    ev.preventDefault();
    var b = ev.target.querySelector("button");
    var m = document.getElementById("connexion-message");
    var email = document.getElementById("email").value.trim();
    b.disabled = true;
    m.hidden = true;
    Api.connexion(email, document.getElementById("mdp").value).then(function (r) {
      b.disabled = false;
      document.getElementById("mdp").value = "";
      if (r.fini) return montrerAppli();
      etapeCode = r;
      document.getElementById("formulaire-connexion").hidden = true;
      document.getElementById("formulaire-code").hidden = false;
      document.getElementById("code-explication").textContent = "Un code de 6 chiffres vient d'être envoyé à " + email + ". Il est valable 10 minutes.";
      document.getElementById("code").focus();
    }, function (e) {
      b.disabled = false;
      m.textContent = e.statut === 400 || e.statut === 401 ? "Adresse ou mot de passe incorrect." : e.message;
      m.hidden = false;
    });
  });

  document.getElementById("formulaire-code").addEventListener("submit", function (ev) {
    ev.preventDefault();
    var b = ev.target.querySelector("button[type=submit]");
    var m = document.getElementById("connexion-message");
    b.disabled = true;
    m.hidden = true;
    Api.code(etapeCode, document.getElementById("code").value.replace(/\s/g, "")).then(function () {
      b.disabled = false;
      document.getElementById("code").value = "";
      montrerAppli();
    }, function (e) {
      b.disabled = false;
      m.textContent = e.statut === 400 || e.statut === 401 ? "Code incorrect ou expiré. Vérifiez-le, ou recommencez la connexion." : e.message;
      m.hidden = false;
    });
  });

  document.getElementById("recommencer").addEventListener("click", function () {
    montrerConnexion("");
  });

  Api.surExpiration(function () {
    montrerConnexion("Votre session a expiré : reconnectez-vous.");
  });

  // ---------- navigation ----------

  function router() {
    if (!Api.connecte()) return montrerConnexion(Api.sessionExpiree() ? "Votre session a expiré : reconnectez-vous." : "");
    var a = O.lireAncre();
    var nom = a.chemin[0] || "accueil";
    if (!enRetour && courante && courante !== window.location.hash) pile.push(courante);
    enRetour = false;
    if (pile.length > 30) pile.shift();
    courante = window.location.hash || "#/accueil";
    var onglet = { accueil: "accueil", calendrier: "calendrier", fiches: "fiches", nouvelle: "fiches", reglages: "reglages" }[nom] || "";
    Array.prototype.forEach.call(document.querySelectorAll(".onglets a"), function (l) {
      if (l.getAttribute("data-onglet") === onglet) l.setAttribute("aria-current", "page");
      else l.removeAttribute("aria-current");
    });
    var jeton = ++compteur;
    O.vider(vue);
    vue.appendChild(O.attente());
    O.domaines().then(function () {
      if (jeton !== compteur) return;
      O.vider(vue);
      var ecran = {
        accueil: accueil,
        calendrier: calendrier,
        fiches: window.Repertoire && Repertoire.vue,
        tache: window.Fiche && Fiche.vue,
        modifier: window.Editeur && Editeur.tache,
        nouvelle: window.Editeur && Editeur.tache,
        procedure: window.Editeur && Editeur.procedure,
        reglages: window.Reglages && Reglages.vue,
      }[nom] || accueil;
      ecran(vue, a);
      window.scrollTo(0, 0);
    }, function (e) {
      if (jeton !== compteur) return;
      O.vider(vue);
      vue.appendChild(O.erreur(e));
    });
  }

  window.addEventListener("hashchange", router);

  // ---------- accueil « Aujourd'hui » ----------

  function ligneElement(e, auj) {
    var t = e.tache;
    var gauche;
    if (e.type === "preparation") {
      gauche = [el("strong", { texte: O.PASTILLE[t.priorite] + " 📞 " + t.preparation }), el("span", { classe: "discret", texte: "Préparation de : " + t.titre })];
    } else if (e.type === "attente") {
      gauche = [el("strong", { texte: O.PASTILLE[t.priorite] + " ⏳ " + t.titre }), el("span", { classe: "discret", texte: "Attente : " + (t.attente_quoi || "—") })];
    } else {
      gauche = [el("strong", { texte: O.PASTILLE[t.priorite] + " " + t.titre + (t.souplesse === "imperative" ? " 🔒" : "") })];
    }
    gauche.push(el("span", { classe: "discret", texte: O.nomDomaine(t.domaine) }));
    return el("li", {}, [
      el("a", { href: "#/tache/" + t.id, classe: e.groupe === "retard" ? "en-retard" : "" }, [
        el("span", { classe: "ligne-gauche" }, gauche),
        el("span", { classe: "ligne-droite" + (e.groupe === "retard" ? " retard" : "") }, [el("span", { texte: E.libelle(e, auj) })]),
      ]),
    ]);
  }

  function section(id, titreSection, liste, auj, replie, vide) {
    if (!liste.length && !vide) return null;
    var ul = el("ul", { classe: "liste" }, liste.length ? liste.map(function (e) { return ligneElement(e, auj); }) : [el("li", { classe: "vide", texte: vide })]);
    if (replie) {
      return el("details", { classe: "bloc", id: id }, [el("summary", { texte: titreSection + " (" + liste.length + ")" }), ul]);
    }
    return el("section", { classe: "bloc", id: id }, [el("h2", { texte: titreSection }), ul]);
  }

  function tuile(classe, nombre, texte, cible) {
    return el("a", { classe: "chiffre " + classe, href: "#/accueil", onclick: function (ev) {
      ev.preventDefault();
      var c = document.getElementById(cible);
      if (c) c.scrollIntoView({ behavior: "smooth", block: "start" });
    } }, [el("strong", { texte: String(nombre) }), el("span", { texte: texte })]);
  }

  function accueil(zone) {
    O.titre("Aujourd'hui");
    var auj = E.aujourdhui();
    var choixF = O.choixDomaine(O.filtre(), true);
    choixF.setAttribute("aria-label", "Domaine affiché");
    var contenu = el("div", {}, [O.attente()]);
    var dernierEnvoi = el("p", { classe: "discret petit-texte" });
    zone.appendChild(el("p", { classe: "date-du-jour", texte: O.dateLongue(auj).replace(/^./, function (c) { return c.toUpperCase(); }) }));
    zone.appendChild(el("div", { classe: "filtre" }, [choixF]));
    zone.appendChild(contenu);
    zone.appendChild(dernierEnvoi);

    function dessiner(taches) {
      O.vider(contenu);
      var f = O.filtre();
      var garde = f ? O.descendants(f) : null;
      var liste = garde ? taches.filter(function (t) { return garde[t.domaine]; }) : taches;
      var tb = E.tableau(liste, auj);
      var c = tb.compteurs;
      contenu.appendChild(el("div", { classe: "chiffres" }, [
        tuile("rouge", c.retard, "en retard", "s-retard"),
        tuile("orange", c.semaine, "cette semaine", "s-semaine"),
        tuile("gris", c.mois, "ce mois-ci", "s-mois"),
      ]));
      if (!c.retard && !c.semaine) contenu.appendChild(el("p", { classe: "tout-va-bien", texte: "✅ Rien en retard, rien cette semaine." }));
      [
        section("s-retard", "🔴 En retard", tb.retard, auj),
        section("s-semaine", "🟠 Cette semaine", tb.semaine, auj),
        section("s-mois", "⚪ Ce mois-ci", tb.mois, auj),
        section("s-attente", "⏳ En attente", tb.attente, auj),
        section("s-tard", "Plus tard", tb.plus_tard, auj, true),
        section("s-completer", "📝 À compléter : date inconnue", tb.a_completer, auj, true),
      ].forEach(function (s) { if (s) contenu.appendChild(s); });
      if (!liste.length) contenu.appendChild(el("p", { classe: "discret", texte: "Aucune tâche dans ce domaine." }));
    }

    choixF.addEventListener("change", function () {
      O.filtre(choixF.value);
      O.taches().then(dessiner);
    });
    O.taches(true).then(dessiner, function (e) {
      O.vider(contenu);
      contenu.appendChild(O.erreur(e));
    });
    Api.liste("envois", { sort: "-created", perPage: 1, skipTotal: 1 }).then(function (d) {
      var x = d.items[0];
      if (!x) return;
      var quand = x.jour === auj ? "ce matin" : "le " + E.format(x.jour);
      dernierEnvoi.textContent = x.statut === "echec"
        ? "⚠️ E-mail du matin non envoyé (" + quand + ") : " + x.detail
        : x.type === "rien" ? "E-mail du matin : rien à signaler " + quand + "." : "Dernier e-mail : " + quand + " · " + x.objet;
    }, function () {});
  }

  // ---------- calendrier ----------

  var MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
  var JOURS = ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."];

  function calendrier(zone, a) {
    O.titre("Calendrier");
    var auj = E.aujourdhui();
    var mode = a.params.vue === "liste" ? "liste" : "mois";
    var m = /^\d{4}-\d{2}$/.test(a.params.m || "") ? a.params.m : auj.slice(0, 7);
    var debut = mode === "liste" ? auj.slice(0, 7) + "-01" : m + "-01";
    var fin = mode === "liste" ? E.ajouterJours(E.ajouterMois(debut, 12), -1) : E.ajouterJours(E.ajouterMois(debut, 1), -1);

    zone.appendChild(el("div", { classe: "bascules" }, [
      el("a", { classe: "bascule", href: O.ancre("calendrier", { m: m }), "aria-pressed": mode === "mois" ? "true" : "false", texte: "Mois" }),
      el("a", { classe: "bascule", href: O.ancre("calendrier", { vue: "liste" }), "aria-pressed": mode === "liste" ? "true" : "false", texte: "Liste sur 12 mois" }),
    ]));
    var contenu = el("div", {}, [O.attente()]);
    zone.appendChild(contenu);

    Promise.all([
      O.taches(),
      Api.tout("historique", { filter: "type = 'fait' && date >= " + Api.texteFiltre(debut) + " && date <= " + Api.texteFiltre(fin + " 23:59:59"), sort: "date" }),
    ]).then(function (r) {
      var f = O.filtre();
      var garde = f ? O.descendants(f) : null;
      var taches = garde ? r[0].filter(function (t) { return garde[t.domaine]; }) : r[0];
      var parId = {};
      r[0].forEach(function (t) { parId[t.id] = t; });
      // Événements par jour : échéances prévues et réalisations.
      var jours = {};
      function ajouter(date, ev) {
        (jours[date] = jours[date] || []).push(ev);
      }
      taches.forEach(function (t) {
        E.occurrences(t, debut, fin).forEach(function (o) { ajouter(o.date, { tache: t, type: o.type }); });
      });
      r[1].forEach(function (h) {
        var t = parId[h.tache];
        if (t && (!garde || garde[t.domaine])) ajouter(E.jour(h.date), { tache: t, type: "fait" });
      });
      O.vider(contenu);
      if (f) contenu.appendChild(el("p", { classe: "discret petit-texte", texte: "Domaine affiché : " + O.nomDomaine(f) + " (à changer sur l'accueil)" }));
      if (mode === "liste") liste12(contenu, jours, auj);
      else grille(contenu, jours, m, auj);
    }, function (e) {
      O.vider(contenu);
      contenu.appendChild(O.erreur(e));
    });
  }

  function texteEvenement(ev) {
    var t = ev.tache;
    if (ev.type === "fait") return "✅ " + t.titre;
    if (ev.type === "preparation") return O.PASTILLE[t.priorite] + " 📞 " + t.preparation + " (" + t.titre + ")";
    if (ev.type === "attente") return O.PASTILLE[t.priorite] + " ⏳ Relancer : " + t.titre;
    return O.PASTILLE[t.priorite] + " " + t.titre + (ev.type === "prevue" ? " (prévue)" : "");
  }

  function listeJour(evs) {
    return el("ul", { classe: "liste" }, evs.map(function (ev) {
      return el("li", {}, [el("a", { href: "#/tache/" + ev.tache.id, classe: ev.type === "fait" ? "fait" : "" }, [
        el("span", { classe: "ligne-gauche" }, [el("strong", { texte: texteEvenement(ev) }), el("span", { classe: "discret", texte: O.nomDomaine(ev.tache.domaine) })]),
      ])]);
    }));
  }

  function grille(zone, jours, m, auj) {
    var precedent = E.ajouterMois(m + "-01", -1).slice(0, 7);
    var suivant = E.ajouterMois(m + "-01", 1).slice(0, 7);
    var p = m.split("-");
    zone.appendChild(el("div", { classe: "mois-barre" }, [
      el("a", { classe: "bouton secondaire petit", href: O.ancre("calendrier", { m: precedent }), "aria-label": "Mois précédent", texte: "‹" }),
      el("h2", { texte: MOIS[+p[1] - 1] + " " + p[0] }),
      el("a", { classe: "bouton secondaire petit", href: O.ancre("calendrier", { m: suivant }), "aria-label": "Mois suivant", texte: "›" }),
    ]));
    var detail = el("div", { "aria-live": "polite" });
    var table = el("div", { classe: "grille-mois", role: "grid" });
    JOURS.forEach(function (j) { table.appendChild(el("div", { classe: "jour-nom", texte: j })); });
    var premier = m + "-01";
    var decalage = (new Date(Date.UTC(+p[0], +p[1] - 1, 1)).getUTCDay() + 6) % 7;
    for (var i = 0; i < decalage; i++) table.appendChild(el("div", { classe: "case-vide" }));
    var nb = E.ecart(premier, E.ajouterMois(premier, 1));
    var choisi = null;
    function montrer(d, bouton) {
      if (choisi) choisi.removeAttribute("aria-pressed");
      choisi = bouton;
      bouton.setAttribute("aria-pressed", "true");
      O.vider(detail);
      detail.appendChild(el("h3", { texte: O.dateLongue(d).replace(/^./, function (c) { return c.toUpperCase(); }) }));
      var evs = jours[d] || [];
      if (!evs.length) detail.appendChild(el("p", { classe: "discret", texte: "Rien ce jour-là." }));
      else detail.appendChild(listeJour(evs));
    }
    for (var j = 1; j <= nb; j++) {
      (function (d) {
        var evs = jours[d] || [];
        var points = el("span", { classe: "points", "aria-hidden": "true" });
        evs.slice(0, 4).forEach(function (ev) {
          points.appendChild(el("span", { classe: "point " + (ev.type === "fait" ? "fait" : ev.tache.priorite) }));
        });
        var b = el("button", {
          type: "button", classe: "jour" + (d === auj ? " aujourdhui" : "") + (d < auj ? " passe" : ""),
          "aria-label": O.dateLongue(d) + (evs.length ? ", " + evs.length + " élément" + (evs.length > 1 ? "s" : "") : ", rien"),
          onclick: function () { montrer(d, b); },
        }, [el("span", { classe: "num", texte: String(+d.slice(8)) }), points]);
        table.appendChild(b);
        if (d === auj) setTimeout(function () { montrer(d, b); }, 0);
      })(m + "-" + (j < 10 ? "0" : "") + j);
    }
    zone.appendChild(table);
    zone.appendChild(el("p", { classe: "legende discret", texte: "🔴 critique · 🟠 important · ⚪ confort · ✅ fait. Touchez un jour pour le détail." }));
    zone.appendChild(detail);
  }

  function liste12(zone, jours, auj) {
    var dates = Object.keys(jours).sort();
    if (!dates.length) {
      zone.appendChild(el("p", { classe: "discret", texte: "Rien de prévu sur les 12 prochains mois." }));
      return;
    }
    var moisCourant = "";
    var ul = null;
    dates.forEach(function (d) {
      if (d.slice(0, 7) !== moisCourant) {
        moisCourant = d.slice(0, 7);
        var p = moisCourant.split("-");
        zone.appendChild(el("h2", { classe: "titre-mois", texte: MOIS[+p[1] - 1].replace(/^./, function (c) { return c.toUpperCase(); }) + " " + p[0] }));
        ul = el("ul", { classe: "liste" });
        zone.appendChild(ul);
      }
      jours[d].forEach(function (ev) {
        ul.appendChild(el("li", {}, [el("a", { href: "#/tache/" + ev.tache.id, classe: (ev.type === "fait" ? "fait" : "") + (d === auj ? " aujourdhui" : "") }, [
          el("span", { classe: "ligne-gauche" }, [el("strong", { texte: texteEvenement(ev) }), el("span", { classe: "discret", texte: O.nomDomaine(ev.tache.domaine) })]),
          el("span", { classe: "ligne-droite" }, [el("span", { texte: E.format(d, true) })]),
        ])]));
      });
    });
  }

  // ---------- démarrage ----------

  if (Api.connecte()) {
    // Session prolongée à chaque ouverture (30 jours).
    Api.rafraichir().then(montrerAppli, function (e) {
      if (e && e.statut === 401) montrerConnexion("Votre session a expiré : reconnectez-vous.");
      else montrerAppli();
    });
  } else {
    montrerConnexion(Api.sessionExpiree() ? "Votre session a expiré : reconnectez-vous." : "");
  }
})();
