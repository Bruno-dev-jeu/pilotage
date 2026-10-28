// Onglet « Fiches » (#/fiches, CDC 3.6) : toutes les fiches, avec ou sans
// échéance, rangées par domaine, avec une recherche par mot (sans tenir
// compte des accents ni des majuscules). Boutons de création : tâche avec
// échéance, ou fiche de référence (sans échéance ni rappel).
(function () {
  "use strict";

  var E = window.Echeances;
  var el = O.el;

  function simplifier(t) {
    return String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  }

  function etatCourt(t, auj) {
    if (t.mode === "reference") return "📘 référence";
    if (t.etat === "terminee") return "✅ terminée";
    var els = E.elements(t, auj).filter(function (x) { return x.type !== "preparation"; });
    if (!els.length) return "";
    var x = els[0];
    x.groupe = E.classer(x, auj);
    return E.libelle(x, auj);
  }

  function vue(zone, a) {
    O.titre("Fiches");
    var auj = E.aujourdhui();
    var recherche = el("input", { type: "search", placeholder: "Rechercher un mot (ex. vanne, pneus, Caddy)", "aria-label": "Rechercher une fiche", valeur: a.params.q || "" });
    var choixF = O.choixDomaine(O.filtre(), true);
    choixF.setAttribute("aria-label", "Domaine affiché");
    var genre = O.choix([["", "Toutes les fiches"], ["taches", "Tâches avec échéance"], ["reference", "📘 Fiches de référence"], ["terminees", "✅ Tâches terminées"]], a.params.genre || "");
    genre.setAttribute("aria-label", "Genre de fiche");
    var contenu = el("div", {}, [O.attente()]);
    var domaineNouveau = function () { return choixF.value ? "&domaine=" + encodeURIComponent(choixF.value) : ""; };
    zone.appendChild(el("div", { classe: "actions-2" }, [
      el("a", { classe: "bouton", href: "#/nouvelle", texte: "＋ Tâche", onclick: function (ev) { ev.preventDefault(); window.location.hash = "#/nouvelle?" + domaineNouveau().slice(1); } }),
      el("a", { classe: "bouton secondaire", href: "#/nouvelle?mode=reference", texte: "＋ Fiche de référence", onclick: function (ev) { ev.preventDefault(); window.location.hash = "#/nouvelle?mode=reference" + domaineNouveau(); } }),
    ]));
    zone.appendChild(el("div", { classe: "recherche" }, [recherche, el("div", { classe: "champs" }, [choixF, genre])]));
    zone.appendChild(contenu);

    var toutes = [];
    function dessiner() {
      O.vider(contenu);
      var mots = simplifier(recherche.value).split(/\s+/).filter(Boolean);
      var garde = choixF.value ? O.descendants(choixF.value) : null;
      var liste = toutes.filter(function (t) {
        if (garde && !garde[t.domaine]) return false;
        if (genre.value === "reference" && t.mode !== "reference") return false;
        if (genre.value === "taches" && (t.mode === "reference" || t.etat === "terminee")) return false;
        if (genre.value === "terminees" && t.etat !== "terminee") return false;
        if (!genre.value && t.etat === "terminee") return false;
        if (!mots.length) return true;
        var texte = simplifier([t.titre, t.notes, t.materiel, t.contacts, t.condition, t.preparation, O.nomDomaine(t.domaine)].join(" "));
        return mots.every(function (m) { return texte.indexOf(m) >= 0; });
      });
      if (!liste.length) {
        contenu.appendChild(el("p", { classe: "discret", texte: mots.length ? "Aucune fiche ne contient ces mots." : "Aucune fiche ici." }));
        return;
      }
      contenu.appendChild(el("p", { classe: "discret petit-texte", texte: liste.length + " fiche" + (liste.length > 1 ? "s" : "") }));
      // Rangement dans l'ordre des domaines (arbre des réglages).
      O.arbre().forEach(function (n) {
        var ici = liste.filter(function (t) { return t.domaine === n.domaine.id; });
        if (!ici.length) return;
        ici.sort(function (x, y) {
          if ((x.mode === "reference") !== (y.mode === "reference")) return x.mode === "reference" ? 1 : -1;
          return x.titre.localeCompare(y.titre, "fr");
        });
        contenu.appendChild(el("h2", { classe: "titre-mois", texte: O.nomDomaine(n.domaine.id) }));
        contenu.appendChild(el("ul", { classe: "liste" }, ici.map(function (t) {
          var pastille = t.mode === "reference" ? "📘" : O.PASTILLE[t.priorite];
          return el("li", {}, [el("a", { href: "#/tache/" + t.id }, [
            el("span", { classe: "ligne-gauche" }, [el("strong", { texte: pastille + " " + t.titre })]),
            el("span", { classe: "ligne-droite" }, [el("span", { texte: etatCourt(t, auj) })]),
          ])]);
        })));
      });
    }

    var minuterie = null;
    recherche.addEventListener("input", function () {
      clearTimeout(minuterie);
      minuterie = setTimeout(dessiner, 150);
    });
    choixF.addEventListener("change", function () {
      O.filtre(choixF.value);
      dessiner();
    });
    genre.addEventListener("change", dessiner);
    O.taches(true).then(function (l) {
      toutes = l;
      dessiner();
    }, function (e) {
      O.vider(contenu);
      contenu.appendChild(O.erreur(e));
    });
  }

  window.Repertoire = { vue: vue };
})();
