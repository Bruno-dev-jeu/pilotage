// Fenêtres de dialogue de l'application, à la charte (aucune fenêtre
// technique du navigateur : ni alert, ni confirm, ni prompt). Repris de
// Courses, avec en plus une fenêtre de formulaire.
//   Dialogue.confirmer({ titre, texte, ok, annuler, danger }) → Promise<booléen>
//   Dialogue.informer({ titre, texte, ok })                     → Promise
//   Dialogue.formulaire({ titre, contenu, ok, valider })        → Promise<booléen>
//     contenu : élément DOM (champs) ; valider() : rend une promesse, rejetée
//     avec un message pour garder la fenêtre ouverte et l'afficher.
// Accessible : rôle dialog, focus gardé dans la fenêtre, Échap = annuler,
// focus rendu à l'élément d'origine. Bouton « ✕ Fermer » sur le formulaire.
(function () {
  "use strict";

  function bouton(texte, classe, surClic) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "bouton " + (classe || "");
    b.textContent = texte;
    b.addEventListener("click", surClic);
    return b;
  }

  function focalisables(boite) {
    return Array.prototype.filter.call(
      boite.querySelectorAll("button, input, select, textarea, a[href], label.bouton"),
      function (n) { return !n.disabled && n.offsetParent !== null; }
    );
  }

  function ouvrir(opts, genre) {
    return new Promise(function (resoudre) {
      var precedent = document.activeElement;
      var fond = document.createElement("div");
      fond.className = "dialogue-fond";
      var boite = document.createElement("div");
      boite.className = "dialogue" + (opts.danger ? " dialogue-danger" : "") + (genre === "formulaire" ? " dialogue-formulaire" : "");
      boite.setAttribute("role", genre === "formulaire" ? "dialog" : "alertdialog");
      boite.setAttribute("aria-modal", "true");
      var id = "dialogue-" + Math.random().toString(36).slice(2, 8);
      boite.setAttribute("aria-labelledby", id + "-titre");

      var fini = false;
      var occupe = false;
      function fermer(valeur) {
        if (fini) return;
        fini = true;
        document.removeEventListener("keydown", touche, true);
        document.body.classList.remove("sans-defilement");
        if (fond.parentNode) fond.parentNode.removeChild(fond);
        if (precedent && precedent.focus && precedent.isConnected) precedent.focus();
        resoudre(valeur);
      }

      var tete = document.createElement("div");
      tete.className = "dialogue-tete";
      var titre = document.createElement("h2");
      titre.id = id + "-titre";
      titre.textContent = opts.titre || (genre === "confirmer" ? "Confirmer" : "Information");
      tete.appendChild(titre);
      if (genre === "formulaire") {
        tete.appendChild(bouton("✕ Fermer", "secondaire petit", function () { if (!occupe) fermer(false); }));
      }
      boite.appendChild(tete);

      String(opts.texte || "").split("\n").forEach(function (para) {
        if (!para) return;
        var p = document.createElement("p");
        p.textContent = para;
        boite.appendChild(p);
      });
      if (opts.contenu) boite.appendChild(opts.contenu);

      var message = document.createElement("p");
      message.className = "message";
      message.setAttribute("role", "alert");
      message.hidden = true;
      boite.appendChild(message);

      var actions = document.createElement("div");
      actions.className = "dialogue-actions";
      var annuler = genre !== "informer" ? bouton(opts.annuler || "Annuler", "secondaire", function () { if (!occupe) fermer(false); }) : null;
      var ok = bouton(opts.ok || "OK", opts.danger ? "danger-plein" : "", function () {
        if (genre !== "formulaire" || !opts.valider) return fermer(true);
        if (occupe) return;
        occupe = true;
        ok.disabled = true;
        message.hidden = true;
        Promise.resolve().then(opts.valider).then(function () {
          occupe = false;
          fermer(true);
        }, function (e) {
          occupe = false;
          ok.disabled = false;
          message.textContent = (e && e.message) || String(e || "Erreur");
          message.hidden = false;
        });
      });
      if (annuler) actions.appendChild(annuler);
      actions.appendChild(ok);
      boite.appendChild(actions);

      function touche(ev) {
        if (ev.key === "Escape") {
          ev.preventDefault();
          if (!occupe) fermer(genre === "informer");
        } else if (ev.key === "Tab") {
          var cibles = focalisables(boite);
          if (!cibles.length) return;
          var i = cibles.indexOf(document.activeElement);
          ev.preventDefault();
          cibles[(i + (ev.shiftKey ? cibles.length - 1 : 1) + cibles.length) % cibles.length].focus();
        }
      }
      document.addEventListener("keydown", touche, true);
      // Un appui sur le fond vaut « Annuler » (jamais une validation), sauf
      // sur un formulaire, pour ne pas perdre une saisie par mégarde.
      fond.addEventListener("click", function (ev) {
        if (ev.target === fond && genre === "confirmer") fermer(false);
      });

      fond.appendChild(boite);
      document.body.appendChild(fond);
      document.body.classList.add("sans-defilement");
      // Formulaire : focus sur la fenêtre elle-même, pour ne pas ouvrir le
      // clavier ou le calendrier du téléphone sans que l'on touche un champ.
      if (genre === "formulaire") {
        boite.tabIndex = -1;
        boite.focus();
      } else {
        (opts.danger && annuler ? annuler : ok).focus();
      }
    });
  }

  window.Dialogue = {
    confirmer: function (opts) { return ouvrir(opts || {}, "confirmer"); },
    informer: function (opts) { return ouvrir(opts || {}, "informer"); },
    formulaire: function (opts) { return ouvrir(opts || {}, "formulaire"); },
  };
})();
