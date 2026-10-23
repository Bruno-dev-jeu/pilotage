// Réglages (#/reglages) : destinataire des e-mails et essai d'envoi,
// journal des derniers e-mails, domaines (ajout, nom, pictogramme, parent,
// ordre), compte et session de cet appareil (CDC 2, 6 et 8).
(function () {
  "use strict";

  var E = window.Echeances;
  var el = O.el;
  var VERSION_APPLI = "1.0.0";

  function vue(zone) {
    O.titre("Réglages");
    var contenu = el("div", {}, [O.attente()]);
    zone.appendChild(contenu);
    Promise.all([
      Api.liste("reglages", { perPage: 1, sort: "created", skipTotal: 1 }),
      Api.liste("envois", { perPage: 10, sort: "-created", skipTotal: 1 }),
      O.domaines(true),
      O.taches(),
    ]).then(function (r) {
      O.vider(contenu);
      courriels(contenu, r[0].items[0] || null, r[1].items);
      domaines(contenu, r[3]);
      compte(contenu);
    }, function (e) {
      O.vider(contenu);
      contenu.appendChild(O.erreur(e));
    });
  }

  // ---------- e-mails ----------

  var NOMS_ENVOI = { quotidien: "E-mail du matin", lundi: "Résumé du lundi", essai: "Essai", rien: "Rien à signaler" };

  function courriels(zone, reglage, envois) {
    var adresse = el("input", { type: "email", autocomplete: "email", valeur: reglage ? reglage.email_rappels : "", placeholder: "Même adresse que le rapport de sauvegarde du PC" });
    var etat = el("p", { classe: "discret", "aria-live": "polite" });
    var enregistrer = el("button", { type: "button", classe: "bouton", texte: "Enregistrer l'adresse" });
    enregistrer.addEventListener("click", function () {
      var v = adresse.value.trim();
      if (v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
        etat.textContent = "Adresse e-mail incorrecte.";
        return;
      }
      enregistrer.disabled = true;
      var d = { email_rappels: v, adresse_site: window.location.origin };
      (reglage ? Api.modifier("reglages", reglage.id, d) : Api.creer("reglages", d)).then(function (n) {
        reglage = n;
        enregistrer.disabled = false;
        etat.textContent = "Adresse enregistrée ✓";
      }, function (e) {
        enregistrer.disabled = false;
        etat.textContent = "Non enregistrée : " + e.message;
      });
    });
    var essai = el("button", { type: "button", classe: "bouton secondaire", texte: "📨 Envoyer un e-mail d'essai" });
    essai.addEventListener("click", function () {
      essai.disabled = true;
      etat.textContent = "Envoi de l'essai…";
      Api.essaiCourriel().then(function (r) {
        essai.disabled = false;
        etat.textContent = (r && r.message) || "Essai envoyé.";
      }, function (e) {
        essai.disabled = false;
        etat.textContent = "⚠️ " + ((e.donnees && e.donnees.message) || e.message);
      });
    });

    var journal = el("ul", { classe: "liste" }, envois.length ? envois.map(function (x) {
      return el("li", {}, [el("div", { classe: "ligne-fixe" }, [
        el("span", { classe: "ligne-gauche" }, [
          el("strong", { texte: (x.statut === "echec" ? "⚠️ " : "") + (NOMS_ENVOI[x.type] || x.type) + " · " + E.format(x.jour) }),
          el("span", { classe: "discret", texte: x.objet || x.detail || "" }),
          x.objet && x.detail ? el("span", { classe: "discret", texte: x.detail }) : null,
        ]),
      ])]);
    }) : [el("li", { classe: "vide", texte: "Aucun e-mail pour l'instant." })]);

    zone.appendChild(el("section", { classe: "carte" }, [
      el("h2", { texte: "📨 E-mails de rappel" }),
      el("p", { classe: "aide", texte: "Un seul e-mail par jour au plus, vers 7 h, seulement s'il y a un rappel ou un retard ; résumé complet chaque lundi." }),
      O.champ("Adresse qui reçoit les rappels", adresse),
      enregistrer,
      essai,
      etat,
      el("h3", { texte: "Derniers envois" }),
      journal,
    ]));
  }

  // ---------- domaines ----------

  function domaines(zone, taches) {
    var nbParDomaine = {};
    taches.forEach(function (t) { nbParDomaine[t.domaine] = (nbParDomaine[t.domaine] || 0) + 1; });
    var ul = el("ul", { classe: "liste" });
    O.arbre().forEach(function (a) {
      var d = a.domaine;
      ul.appendChild(el("li", {}, [el("button", { type: "button", classe: "ligne-bouton profondeur-" + a.profondeur, onclick: function () { editerDomaine(d); } }, [
        el("span", { classe: "ligne-gauche" }, [el("strong", { texte: (d.emoji ? d.emoji + " " : "") + d.nom })]),
        el("span", { classe: "ligne-droite discret", texte: (nbParDomaine[d.id] || 0) + " tâche" + ((nbParDomaine[d.id] || 0) > 1 ? "s" : "") }),
      ])]));
    });
    zone.appendChild(el("section", { classe: "carte" }, [
      el("h2", { texte: "🗂️ Domaines" }),
      el("p", { classe: "aide", texte: "Touchez un domaine pour le renommer, changer son pictogramme ou le ranger dans un autre." }),
      ul,
      el("button", { type: "button", classe: "bouton secondaire", texte: "➕ Ajouter un domaine", onclick: function () { editerDomaine(null); } }),
    ]));
  }

  function editerDomaine(d) {
    var nom = el("input", { type: "text", maxlength: "80", valeur: d ? d.nom : "", placeholder: "Ex. VW Golf, Jardin, Vélo" });
    var emoji = el("input", { type: "text", maxlength: "16", valeur: d ? d.emoji : "", placeholder: "Ex. 🚗" });
    var parent = O.choix([["", "Aucun : domaine principal"]].concat(O.arbre().filter(function (a) {
      return !d || !O.descendants(d.id)[a.domaine.id];
    }).map(function (a) {
      return [a.domaine.id, new Array(a.profondeur + 1).join("\u00a0\u00a0\u00a0\u00a0") + (a.domaine.emoji ? a.domaine.emoji + " " : "") + a.domaine.nom];
    })), d ? d.parent : "");
    var ordre = el("input", { type: "number", inputmode: "numeric", valeur: d ? String(d.ordre || 0) : "100" });
    var supprimer = d ? el("button", { type: "button", classe: "bouton danger", texte: "Supprimer ce domaine" }) : null;
    if (supprimer) {
      supprimer.addEventListener("click", function () {
        var enfants = O.arbre().filter(function (a) { return a.domaine.parent === d.id; });
        if (enfants.length) {
          Dialogue.informer({ titre: "Suppression impossible", texte: "Ce domaine contient des sous-domaines : déplacez-les ou supprimez-les d'abord." });
          return;
        }
        Dialogue.confirmer({ titre: "Supprimer « " + d.nom + " » ?", texte: "Seulement possible s'il ne contient ni tâche ni sous-domaine.", ok: "Supprimer", annuler: "Garder", danger: true }).then(function (oui) {
          if (!oui) return;
          Api.supprimer("domaines", d.id).then(function () {
            // Rechargement complet : ferme aussi la fenêtre du domaine.
            window.location.reload();
          }, function () {
            Dialogue.informer({ titre: "Suppression impossible", texte: "Ce domaine contient encore des tâches ou des sous-domaines : déplacez-les d'abord." });
          });
        });
      });
    }
    Dialogue.formulaire({
      titre: d ? "Modifier le domaine" : "Nouveau domaine",
      contenu: el("div", { classe: "formulaire" }, [
        O.champ("Nom", nom),
        el("div", { classe: "champs" }, [O.champ("Pictogramme", emoji), O.champ("Ordre", ordre)]),
        O.champ("Ranger dans", parent),
        supprimer,
      ]),
      ok: "Enregistrer",
      valider: function () {
        if (!nom.value.trim()) throw new Error("Indiquez le nom du domaine.");
        var v = { nom: nom.value.trim(), emoji: emoji.value.trim(), parent: parent.value, ordre: parseInt(ordre.value, 10) || 0 };
        return d ? Api.modifier("domaines", d.id, v) : Api.creer("domaines", v);
      },
    }).then(function (ok) {
      if (!ok) return;
      O.oublierTout();
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
  }

  // ---------- compte ----------

  function dateHeure(d) {
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) + " à " +
      d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  }

  function compte(zone) {
    var u = Api.utilisateur() || {};
    var fin = Api.finSession();
    var installee = window.navigator.standalone === true || (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches);
    zone.appendChild(el("section", { classe: "carte" }, [
      el("h2", { texte: "👤 Compte et appareil" }),
      el("dl", { classe: "infos" }, [
        el("dt", { texte: "Compte" }), el("dd", { texte: u.email || "—" }),
        el("dt", { texte: "Session ouverte jusqu'au" }), el("dd", { texte: fin ? dateHeure(fin) : "—" }),
        el("dt", { texte: "Prolongée" }), el("dd", { texte: "à chaque ouverture" }),
        el("dt", { texte: "Sur l'écran d'accueil" }), el("dd", { texte: installee ? "oui" : "non" }),
        el("dt", { texte: "Version" }), el("dd", { texte: VERSION_APPLI }),
      ]),
      installee ? null : el("p", { classe: "aide", texte: "Sur iPhone ou iPad : bouton Partager de Safari, puis « Sur l'écran d'accueil », pour ouvrir le Pilotage comme une application." }),
      el("p", { classe: "aide", texte: "Mot de passe : il se change dans la console d'administration (tunnel SSH). Ne le notez jamais dans une fiche." }),
      el("button", { type: "button", classe: "bouton danger", texte: "Se déconnecter", onclick: function () {
        Dialogue.confirmer({ titre: "Se déconnecter ?", texte: "Il faudra saisir à nouveau votre mot de passe, puis le code reçu par e-mail.", ok: "Se déconnecter", annuler: "Rester connecté", danger: true }).then(function (oui) {
          if (!oui) return;
          Api.deconnexion();
          window.location.hash = "#/accueil";
          window.location.reload();
        });
      } }),
    ]));
  }

  window.Reglages = { vue: vue };
})();
