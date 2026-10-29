// Écran « Contrôles de la nuit » (#/controles?nuit=AAAA-MM-JJ, CDC 5.3) :
// comptes rendus en clair de chaque contrôle, les plus graves d'abord, et la
// liste des 14 dernières nuits. Lecture seule : seul le serveur les écrit.
(function () {
  "use strict";

  var E = window.Echeances;
  var el = O.el;
  var STATUT = { ok: "✅", info: "ℹ️", attention: "🟠", alerte: "🔴" };
  var RANG = { alerte: 0, attention: 1, info: 2, ok: 3 };

  // Résumé d'une nuit, en une ligne (accueil et liste des nuits).
  function resume(liste) {
    if (!liste.length) return "⚠️ Aucun compte rendu : le contrôle de la nuit n'a pas tourné.";
    var n = liste.filter(function (c) { return c.statut === "alerte" || c.statut === "attention"; }).length;
    return n ? "🛡️ " + liste.length + " contrôles, " + n + " point" + (n > 1 ? "s" : "") + " à regarder" : "🛡️ " + liste.length + " contrôles, tout va bien";
  }

  function vue(zone, a) {
    O.titre("Contrôles de la nuit");
    zone.appendChild(O.barreFermer("#/accueil"));
    var auj = E.aujourdhui();
    var debut = E.ajouterJours(auj, -13);
    var contenu = el("div", {}, [O.attente()]);
    zone.appendChild(contenu);
    Api.tout("controles", { filter: "nuit >= " + Api.texteFiltre(debut), sort: "-nuit" }, 1500).then(function (l) {
      O.vider(contenu);
      var parNuit = {};
      l.forEach(function (c) { (parNuit[c.nuit] = parNuit[c.nuit] || []).push(c); });
      var nuits = Object.keys(parNuit).sort().reverse();
      var choisie = a.params.nuit && parNuit[a.params.nuit] ? a.params.nuit : nuits[0];
      if (!choisie) {
        contenu.appendChild(el("p", { classe: "message", texte: "Aucun compte rendu pour l'instant. Les contrôles tournent chaque nuit à 5 h, une fois installés sur le serveur (notice, étape 2)." }));
        return;
      }
      var liste = parNuit[choisie].slice().sort(function (x, y) { return (RANG[x.statut] - RANG[y.statut]) || (x.titre < y.titre ? -1 : 1); });
      contenu.appendChild(el("h2", { texte: "Nuit du " + O.dateLongue(choisie).replace(/^[a-zé]+ /, "") }));
      contenu.appendChild(el("p", { classe: "discret", texte: resume(liste) + (choisie !== auj ? " (ce n'est pas la nuit dernière)" : "") }));
      liste.forEach(function (c) {
        contenu.appendChild(el("section", { classe: "carte controle " + c.statut }, [
          el("h3", { texte: STATUT[c.statut] + " " + c.titre }),
          el("p", { classe: "texte-libre", texte: c.texte }),
        ]));
      });
      var autres = el("ul", { classe: "liste" });
      for (var i = 0; i < 14; i++) {
        var n = E.ajouterJours(auj, -i);
        var lc = parNuit[n] || [];
        autres.appendChild(el("li", {}, [el("a", { href: O.ancre("controles", { nuit: n }), classe: n === choisie ? "aujourdhui" : "" }, [
          el("span", { classe: "ligne-gauche" }, [el("strong", { texte: O.dateLongue(n).replace(/ \d{4}$/, "") })]),
          el("span", { classe: "ligne-droite" }, [el("span", { texte: resume(lc).replace("🛡️ ", "") })]),
        ])]));
      }
      contenu.appendChild(el("h2", { classe: "titre-mois", texte: "Les 14 dernières nuits" }));
      contenu.appendChild(autres);
      contenu.appendChild(el("p", { classe: "aide", texte: "Comptes rendus gardés 90 jours. Une alerte 🔴 crée aussi une tâche « Réparer : … » dans le domaine Serveur." }));
    }, function (e) {
      O.vider(contenu);
      contenu.appendChild(O.erreur(e));
    });
  }

  // Ligne de l'accueil : résumé de la nuit dernière, lien vers l'écran.
  function ligneAccueil(zone) {
    var auj = E.aujourdhui();
    Api.liste("controles", { filter: "nuit = " + Api.texteFiltre(auj), perPage: 200, skipTotal: 1 }).then(function (d) {
      var heure = E.paris(Date.now()).heure;
      // Avant 6 h, les contrôles de la nuit peuvent ne pas être encore passés.
      if (!d.items.length && heure < 6) return;
      var n = d.items.filter(function (c) { return c.statut === "alerte" || c.statut === "attention"; }).length;
      zone.appendChild(el("a", { classe: "ligne-controles" + (n || !d.items.length ? " a-regarder" : ""), href: "#/controles" }, [
        el("span", { texte: "Cette nuit : " + resume(d.items).replace("🛡️ ", "") }),
        el("span", { "aria-hidden": "true", texte: "›" }),
      ]));
    }, function () {});
  }

  window.Controles = { vue: vue, ligneAccueil: ligneAccueil };
})();
