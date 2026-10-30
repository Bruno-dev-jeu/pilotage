// Éditeurs du Pilotage (CDC 3.4) :
//  - #/modifier/ID et #/nouvelle?domaine=ID : la tâche (titre, domaine,
//    priorité, répétition, échéance, souplesse, préparation, condition,
//    matériel, contacts, notes) ;
//  - #/procedure/ID : les étapes pas à pas, avec photos (réduites à environ
//    300 Ko), vidéo courte et lien ; ordre changé par les flèches ; copie des
//    étapes d'une autre tâche (ex. deux voitures).
// Rappel affiché : jamais de mot de passe ni de code dans une fiche.
(function () {
  "use strict";

  var E = window.Echeances;
  var el = O.el;
  var RAPPEL_SECRET = "🔐 Jamais de mot de passe, de code ni de jeton ici : écrivez seulement où le trouver (ex. « dans le gestionnaire de mots de passe »).";

  // ---------- la tâche ----------

  function tache(zone, a) {
    var id = a.chemin[0] === "modifier" ? a.chemin[1] : "";
    var reference = a.params.mode === "reference";
    O.titre(id ? "Modifier la fiche" : reference ? "Nouvelle fiche de référence" : "Nouvelle tâche");
    zone.appendChild(O.barreFermer(id ? "#/tache/" + id : "#/fiches"));
    var attente = O.attente();
    zone.appendChild(attente);
    Promise.all([id ? Api.un("taches", id) : null, O.regles()]).then(function (r) {
      zone.removeChild(attente);
      var R = r[1];
      formulaire(zone, r[0] || {
        titre: "", domaine: a.params.domaine || O.filtre() || "", priorite: reference ? "confort" : "important",
        mode: reference ? "reference" : "apres", intervalle: 1, unite: "ans",
        dates_fixes: "", echeance: "", souplesse: "souple", tolerance: R.tolerance, rappel_jours: 0, preparation: "", preparation_jours: 0,
        condition: "", etat: "active", derniere_realisation: "", materiel: "", contacts: "", notes: "",
      }, R);
    }, function (e) {
      zone.removeChild(attente);
      zone.appendChild(O.erreur(e));
    });
  }

  function nombre(v, attributs) {
    return el("input", Object.assign({ type: "number", inputmode: "numeric", min: "0", valeur: v ? String(v) : "" }, attributs || {}));
  }

  function formulaire(zone, t, R) {
    var f = {
      titre: el("input", { type: "text", maxlength: "200", valeur: t.titre, placeholder: "Ex. Nettoyer l'adoucisseur d'eau" }),
      domaine: O.choixDomaine(t.domaine, false),
      priorite: O.choix(O.PRIORITES, t.priorite),
      mode: O.choix([["apres", "Répétée : après la dernière réalisation"], ["fixe", "Répétée : à dates fixes du calendrier"], ["unique", "Une seule fois"], ["reference", "📘 Fiche de référence, sans échéance"]], t.mode),
      intervalle: nombre(t.intervalle, { min: "1" }),
      unite: O.choix([["jours", "jours"], ["semaines", "semaines"], ["mois", "mois"], ["ans", "ans"]], t.unite || "mois"),
      dates_fixes: el("input", { type: "text", maxlength: "200", valeur: t.dates_fixes, placeholder: "Ex. 15/01, 15/04, 15/07, 15/10" }),
      echeance: el("input", { type: "date", valeur: E.jour(t.echeance) }),
      souplesse: O.choix([["souple", "Souple"], ["imperative", "🔒 Impérative"]], t.souplesse),
      tolerance: nombre(t.tolerance),
      rappel_jours: nombre(t.rappel_jours),
      preparation: el("input", { type: "text", maxlength: "300", valeur: t.preparation, placeholder: "Ex. Appeler le paysagiste pour fixer la date" }),
      preparation_jours: nombre(t.preparation_jours),
      alerte_gel: el("input", { type: "checkbox", coche: t.alerte_gel, id: "alerte-gel" }),
      condition: el("input", { type: "text", maxlength: "300", valeur: t.condition, placeholder: "Ex. Quand l'eau est autour de 12 °C" }),
      derniere_realisation: el("input", { type: "date", valeur: E.jour(t.derniere_realisation) }),
      materiel: el("textarea", { rows: "3", maxlength: "2000", valeur: t.materiel }),
      contacts: el("textarea", { rows: "3", maxlength: "2000", valeur: t.contacts }),
      notes: el("textarea", { rows: "4", maxlength: "5000", valeur: t.notes }),
    };
    if (!t.domaine) f.domaine.insertBefore(el("option", { value: "", texte: "Choisir un domaine…", selected: "selected" }), f.domaine.firstChild);
    var blocApres = el("div", { classe: "champs" }, [O.champ("Tous les", f.intervalle), O.champ("Unité", f.unite)]);
    var blocFixe = O.champ("Dates (JJ/MM chaque année, ou JJ chaque mois)", f.dates_fixes, "Séparées par des virgules. Ex. « 01/11 » chaque 1er novembre ; « 15/01, 15/04, 15/07, 15/10 » chaque trimestre ; « 01 » le 1er de chaque mois.");
    var blocTolerance = O.champ("Tolérance, en jours avant et après", f.tolerance, "La tâche apparaît à date − tolérance et n'est en retard qu'après date + tolérance. Ex. 15.");
    var proposer = el("button", { type: "button", classe: "lien", texte: "Proposer la prochaine date du calendrier" });
    proposer.addEventListener("click", function () {
      var l = E.lireDatesFixes(f.dates_fixes.value);
      if (!l) return Dialogue.informer({ titre: "Dates illisibles", texte: "Écrivez les dates au format JJ/MM, séparées par des virgules. Ex. 15/01, 15/04." });
      f.echeance.value = E.dateFixeApres(l, E.ajouterJours(E.aujourdhui(), -1));
    });
    var blocEcheance = el("div", { classe: "formulaire" });
    var blocCondition = O.champ("Condition à observer (facultatif)", f.condition);
    function majVisibles() {
      blocEcheance.hidden = f.mode.value === "reference";
      blocCondition.hidden = f.mode.value === "reference";
      blocApres.hidden = f.mode.value !== "apres";
      blocFixe.hidden = f.mode.value !== "fixe";
      proposer.hidden = f.mode.value !== "fixe";
      blocTolerance.hidden = f.souplesse.value !== "souple";
    }
    f.mode.addEventListener("change", majVisibles);
    f.souplesse.addEventListener("change", majVisibles);

    var message = el("p", { classe: "message", role: "alert", hidden: "hidden" });
    var enregistrer = el("button", { type: "button", classe: "bouton", texte: "Enregistrer" });
    function regle(p) {
      var x = R[p];
      return (x.retard ? (x.retard === 1 ? "rappel chaque jour en retard" : "tous les " + x.retard + " jours en retard") : "en retard : résumé du lundi") +
        (x.matin ? "" : ", rappels le lundi seulement");
    }
    [
      el("div", { classe: "champs" }, [
        O.champ("Priorité", f.priorite),
        O.champ("Date", f.souplesse),
      ]),
      el("p", { classe: "aide", texte: "Souple : à quelques jours près (pergola). Impérative : obligation ou contrat, en retard dès le lendemain (contrôle technique)." }),
      el("p", { classe: "aide", texte: "🔴 critique : " + regle("critique") + " · 🟠 important : " + regle("important") + " · ⚪ confort : " + regle("confort") + ". Règles modifiables dans les Réglages." }),
      blocTolerance,
      blocApres,
      blocFixe,
      O.champ("Prochaine échéance", f.echeance, "Vide : date inconnue, la tâche va dans « À compléter » et n'envoie aucun rappel."),
      proposer,
      O.champ("Dernière réalisation (facultatif)", f.derniere_realisation),
      O.champ("Premier rappel par e-mail, en jours avant (facultatif)", f.rappel_jours, "Vide : " + R.avance_annuelle + " jours pour une tâche annuelle ou plus, " + R.avance + " jours sinon. Ex. 90 pour une carte d'identité."),
      el("h3", { texte: "Préparation à l'avance (facultatif)" }),
      O.champ("Ce qu'il faut faire à l'avance", f.preparation),
      O.champ("Combien de jours avant", f.preparation_jours, "Ex. 60 pour réserver un artisan, 30 pour un rendez-vous."),
      el("label", { classe: "case-ligne", "for": "alerte-gel" }, [f.alerte_gel, " ❄️ Prévenir dans l'e-mail du matin quand le gel est annoncé à la maison (commune des Réglages), tant que la tâche n'est pas faite. Ex. hiverner la piscine."]),
    ].forEach(function (n) { blocEcheance.appendChild(n); });
    majVisibles();
    zone.appendChild(el("div", { classe: "formulaire" }, [
      O.champ(t.mode === "reference" ? "Titre de la fiche" : "Ce qu'il faut faire", f.titre),
      O.champ("Domaine", f.domaine),
      O.champ("Genre de fiche", f.mode, "Une fiche de référence garde une procédure, des photos, des contacts, sans aucune date ni rappel. Elle peut devenir une tâche répétée plus tard."),
      blocEcheance,
      el("h3", { texte: "Informations" }),
      blocCondition,
      el("p", { classe: "rappel-secret", texte: RAPPEL_SECRET }),
      O.champ("Matériel ou produits nécessaires", f.materiel),
      O.champ("Contacts utiles", f.contacts),
      O.champ("Notes", f.notes),
      message,
      enregistrer,
      t.id ? el("button", { type: "button", classe: "bouton danger", texte: "Supprimer la fiche", onclick: function () { supprimer(t); } }) : null,
    ]));

    enregistrer.addEventListener("click", function () {
      message.hidden = true;
      var d = {
        titre: f.titre.value.trim(), domaine: f.domaine.value, priorite: f.priorite.value, mode: f.mode.value,
        intervalle: parseInt(f.intervalle.value, 10) || 0, unite: f.unite.value, dates_fixes: f.dates_fixes.value.trim(),
        echeance: O.dateBase(f.echeance.value), souplesse: f.souplesse.value,
        tolerance: f.souplesse.value === "souple" ? parseInt(f.tolerance.value, 10) || 0 : 0,
        rappel_jours: parseInt(f.rappel_jours.value, 10) || 0, preparation: f.preparation.value.trim(),
        preparation_jours: parseInt(f.preparation_jours.value, 10) || 0, condition: f.condition.value.trim(),
        derniere_realisation: O.dateBase(f.derniere_realisation.value), materiel: f.materiel.value.trim(),
        contacts: f.contacts.value.trim(), notes: f.notes.value.trim(),
        alerte_gel: f.mode.value !== "reference" && f.alerte_gel.checked,
      };
      // Fiche de référence : aucune date, aucun rappel.
      if (d.mode === "reference") {
        d.echeance = "";
        d.condition = "";
        d.preparation = "";
        d.preparation_jours = 0;
        d.rappel_jours = 0;
        d.date_limite = "";
        d.rappel_envoye = "";
        d.etat = "active";
      }
      var erreurs = [];
      if (!d.titre) erreurs.push(d.mode === "reference" ? "Indiquez le titre de la fiche." : "Indiquez ce qu'il faut faire.");
      if (!d.domaine) erreurs.push("Choisissez un domaine.");
      if (d.mode === "apres" && d.intervalle < 1) erreurs.push("Indiquez l'intervalle (ex. tous les 6 mois).");
      if (d.mode === "fixe" && !E.lireDatesFixes(d.dates_fixes)) erreurs.push("Écrivez les dates fixes au format JJ/MM, séparées par des virgules.");
      if (d.preparation && !d.preparation_jours) erreurs.push("Indiquez combien de jours avant faire la préparation.");
      if (erreurs.length) {
        message.textContent = erreurs.join(" ");
        message.hidden = false;
        return;
      }
      // Échéance changée à la main : le premier rappel repartira, et une
      // date limite d'origine n'a plus lieu d'être.
      if (t.id && E.jour(t.echeance) !== E.jour(d.echeance)) {
        d.rappel_envoye = "";
        d.date_limite = "";
      }
      // Nouvelle tâche, ou tâche terminée qui reçoit une nouvelle date : active.
      if (!t.id || (t.etat === "terminee" && d.echeance)) d.etat = "active";
      enregistrer.disabled = true;
      (t.id ? Api.modifier("taches", t.id, d) : Api.creer("taches", d)).then(function (r) {
        O.oublier();
        O.remplacer("#/tache/" + r.id);
      }, function (e) {
        enregistrer.disabled = false;
        message.textContent = "Non enregistré : " + e.message;
        message.hidden = false;
      });
    });
  }

  function supprimer(t) {
    Dialogue.confirmer({
      titre: "Supprimer « " + t.titre + " » ?",
      texte: "La tâche, sa procédure (photos et vidéos comprises) et tout son historique (justificatifs compris) seront effacés définitivement.\nPour une tâche qui ne revient plus, préférez « Fait » sur une tâche « Une seule fois ».",
      ok: "Supprimer définitivement", annuler: "Garder", danger: true,
    }).then(function (oui) {
      if (!oui) return;
      Api.supprimer("taches", t.id).then(function () {
        O.oublier();
        O.remplacer("#/accueil");
      }, function (e) {
        Dialogue.informer({ titre: "Suppression impossible", texte: e.message });
      });
    });
  }

  // ---------- la procédure ----------

  function procedure(zone, a) {
    var id = a.chemin[1];
    O.titre("Procédure");
    zone.appendChild(O.barreFermer("#/tache/" + id));
    var contenu = el("div", {}, [O.attente()]);
    zone.appendChild(contenu);
    function charger() {
      return Promise.all([
        Api.un("taches", id),
        Api.tout("etapes", { filter: "tache = " + Api.texteFiltre(id), sort: "ordre,created" }),
      ]).then(function (r) {
        O.vider(contenu);
        dessinerProcedure(contenu, r[0], r[1], charger);
      }, function (e) {
        O.vider(contenu);
        contenu.appendChild(O.erreur(e));
      });
    }
    charger();
  }

  function dessinerProcedure(zone, t, etapes, recharger) {
    zone.appendChild(el("h2", { texte: t.titre }));
    zone.appendChild(el("p", { classe: "rappel-secret", texte: RAPPEL_SECRET }));
    zone.appendChild(el("p", { classe: "aide", texte: "Chaque champ est enregistré dès que vous le quittez. Photos réduites automatiquement ; vidéo d'une minute environ (100 Mo au plus), sinon un lien." }));
    etapes.forEach(function (x, i) {
      zone.appendChild(carteEtape(t, x, i, etapes, recharger));
    });
    var ajouter = el("button", { type: "button", classe: "bouton", texte: "➕ Ajouter une étape" });
    ajouter.addEventListener("click", function () {
      ajouter.disabled = true;
      var ordre = etapes.length ? (etapes[etapes.length - 1].ordre || etapes.length * 10) + 10 : 10;
      Api.creer("etapes", { tache: t.id, ordre: ordre, texte: "" }).then(function () {
        return recharger();
      }).then(function () {
        var cartes = document.querySelectorAll(".carte-etape");
        if (cartes.length) cartes[cartes.length - 1].querySelector("textarea").focus();
      }, function (e) {
        ajouter.disabled = false;
        Dialogue.informer({ titre: "Étape non ajoutée", texte: e.message });
      });
    });
    zone.appendChild(ajouter);
    zone.appendChild(el("button", { type: "button", classe: "bouton secondaire", texte: "📄 Copier les étapes d'une autre tâche", onclick: function () { copier(t, etapes, recharger); } }));
    zone.appendChild(el("a", { classe: "bouton secondaire", href: "#/tache/" + t.id, texte: "Terminé : revenir à la fiche" }));
  }

  function carteEtape(t, x, i, etapes, recharger) {
    var etat = el("span", { classe: "etat-enregistrement", "aria-live": "polite" });
    function enregistrer(champ, valeur) {
      if ((x[champ] || "") === valeur) return;
      etat.textContent = "Enregistrement…";
      Api.modifier("etapes", x.id, (function () { var o = {}; o[champ] = valeur; return o; })()).then(function (n) {
        x[champ] = n[champ];
        etat.textContent = "Enregistré ✓";
      }, function (e) {
        etat.textContent = "⚠️ Non enregistré : " + e.message;
      });
    }
    var texte = el("textarea", { rows: "4", maxlength: "5000", valeur: x.texte, placeholder: "Ce qu'il faut faire à cette étape." });
    var commande = el("textarea", { rows: "2", maxlength: "3000", valeur: x.commande, classe: "monospace", placeholder: "Commande à copier (facultatif)", autocapitalize: "off", autocorrect: "off", spellcheck: "false" });
    var lien = el("input", { type: "url", valeur: x.lien, placeholder: "https://… (facultatif)" });
    texte.addEventListener("change", function () { enregistrer("texte", texte.value.trim()); });
    commande.addEventListener("change", function () { enregistrer("commande", commande.value.trim()); });
    lien.addEventListener("change", function () { enregistrer("lien", lien.value.trim()); });

    // Ordre : échange avec la voisine, puis numérotation 10, 20, 30…
    function deplacer(sens) {
      var l = etapes.slice();
      var j = i + sens;
      if (j < 0 || j >= l.length) return;
      var tmp = l[i];
      l[i] = l[j];
      l[j] = tmp;
      Promise.all(l.map(function (e, k) {
        return e.ordre === (k + 1) * 10 ? null : Api.modifier("etapes", e.id, { ordre: (k + 1) * 10 });
      })).then(recharger, function (e) {
        Dialogue.informer({ titre: "Ordre non enregistré", texte: e.message });
      });
    }

    var avancement = el("p", { classe: "discret", "aria-live": "polite" });
    var photos = el("input", { type: "file", accept: "image/*", multiple: "multiple", classe: "invisible", id: "photos-" + x.id });
    photos.addEventListener("change", function () {
      var liste = Array.prototype.slice.call(photos.files || []);
      photos.value = "";
      if (!liste.length) return;
      if ((x.photos || []).length + liste.length > 20) return Dialogue.informer({ titre: "Trop de photos", texte: "20 photos au plus par étape." });
      avancement.textContent = "Réduction des photos…";
      Promise.all(liste.map(O.photoReduite)).then(function (blobs) {
        var f = new FormData();
        blobs.forEach(function (b, k) { f.append("photos+", b, O.nomFichier("photo-" + (k + 1), "jpg")); });
        return Api.modifierFormulaire("etapes", x.id, f, function (r) { avancement.textContent = "Envoi : " + Math.round(r * 100) + " %"; });
      }).then(recharger, function (e) {
        avancement.textContent = "⚠️ Photos non enregistrées : " + e.message;
      });
    });
    var video = el("input", { type: "file", accept: "video/*", classe: "invisible", id: "video-" + x.id });
    video.addEventListener("change", function () {
      var v = video.files && video.files[0];
      video.value = "";
      if (!v) return;
      if (v.size > 104857600) {
        return Dialogue.informer({ titre: "Vidéo trop longue", texte: "Cette vidéo fait " + O.taille(v.size) + " : 100 Mo au plus (chaque Mo compte aussi dans les sauvegardes du serveur). Filmez plus court, ou déposez-la sur YouTube (non répertoriée) ou Google Drive et collez le lien." });
      }
      var f = new FormData();
      f.append("video", v, v.name || O.nomFichier("video", "mov"));
      avancement.textContent = "Envoi de la vidéo (" + O.taille(v.size) + ")…";
      Api.modifierFormulaire("etapes", x.id, f, function (r) {
        avancement.textContent = "Envoi de la vidéo : " + Math.round(r * 100) + " % de " + O.taille(v.size);
      }).then(recharger, function (e) {
        avancement.textContent = "⚠️ Vidéo non enregistrée : " + e.message;
      });
    });

    var galerie = el("div", { classe: "galerie" });
    (x.photos || []).forEach(function (nom) {
      var img = el("img", { alt: "" });
      Api.urlFichier("etapes", x.id, nom, "thumb=400x0").then(function (u) { img.src = u; }, function () {});
      galerie.appendChild(el("div", { classe: "vignette" }, [
        img,
        el("button", { type: "button", classe: "retirer", "aria-label": "Retirer cette photo", texte: "✕", onclick: function () {
          Dialogue.confirmer({ titre: "Retirer cette photo ?", ok: "Retirer", annuler: "Garder", danger: true }).then(function (oui) {
            if (!oui) return;
            Api.modifier("etapes", x.id, { "photos-": [nom] }).then(recharger, function (e) {
              Dialogue.informer({ titre: "Photo non retirée", texte: e.message });
            });
          });
        } }),
      ]));
    });

    var blocVideo = null;
    if (x.video) {
      var lecteur = el("video", { controls: "controls", playsinline: "playsinline", preload: "metadata" });
      Api.urlFichier("etapes", x.id, x.video).then(function (u) { lecteur.src = u; }, function () {});
      blocVideo = el("div", {}, [lecteur, el("button", { type: "button", classe: "bouton danger petit", texte: "Retirer la vidéo", onclick: function () {
        Dialogue.confirmer({ titre: "Retirer la vidéo ?", ok: "Retirer", annuler: "Garder", danger: true }).then(function (oui) {
          if (!oui) return;
          Api.modifier("etapes", x.id, { video: null }).then(recharger, function (e) {
            Dialogue.informer({ titre: "Vidéo non retirée", texte: e.message });
          });
        });
      } })]);
    }

    return el("section", { classe: "carte carte-etape" }, [
      el("div", { classe: "tete-section" }, [
        el("h3", { texte: "Étape " + (i + 1) }),
        el("div", { classe: "ordre" }, [
          el("button", { type: "button", classe: "bouton secondaire petit", texte: "↑", "aria-label": "Monter l'étape", disabled: i === 0 ? "disabled" : null, onclick: function () { deplacer(-1); } }),
          el("button", { type: "button", classe: "bouton secondaire petit", texte: "↓", "aria-label": "Descendre l'étape", disabled: i === etapes.length - 1 ? "disabled" : null, onclick: function () { deplacer(1); } }),
        ]),
      ]),
      O.champ("Ce qu'il faut faire", texte),
      O.champ("Commande à copier", commande),
      galerie,
      blocVideo,
      el("div", { classe: "actions-2" }, [
        photos,
        el("label", { "for": photos.id, classe: "bouton secondaire", texte: "📷 Photos" }),
        video,
        x.video ? null : el("label", { "for": video.id, classe: "bouton secondaire", texte: "🎬 Vidéo" }),
      ]),
      avancement,
      O.champ("Lien (vidéo longue, notice)", lien),
      el("div", { classe: "pied-etape" }, [
        etat,
        el("button", { type: "button", classe: "lien danger-texte", texte: "Supprimer l'étape", onclick: function () {
          Dialogue.confirmer({ titre: "Supprimer l'étape " + (i + 1) + " ?", texte: "Son texte, ses photos et sa vidéo seront effacés.", ok: "Supprimer", annuler: "Garder", danger: true }).then(function (oui) {
            if (!oui) return;
            Api.supprimer("etapes", x.id).then(recharger, function (e) {
              Dialogue.informer({ titre: "Étape non supprimée", texte: e.message });
            });
          });
        } }),
      ]),
    ]);
  }

  // Copie des étapes d'une autre tâche, ajoutées à la suite : texte,
  // commande, lien, photos et vidéo (fichiers relus puis renvoyés).
  function copier(t, etapes, recharger) {
    O.taches().then(function (toutes) {
      var autres = toutes.filter(function (x) { return x.id !== t.id; });
      var choix = O.choix([["", "Choisir une tâche…"]].concat(autres.map(function (x) {
        return [x.id, x.titre + " — " + O.nomDomaine(x.domaine, true)];
      })), "");
      var avancement = el("p", { classe: "discret", "aria-live": "polite" });
      return Dialogue.formulaire({
        titre: "📄 Copier des étapes",
        texte: "Les étapes de la tâche choisie sont ajoutées à la suite de celles-ci, avec leurs photos et leur vidéo.",
        contenu: el("div", { classe: "formulaire" }, [O.champ("Tâche d'origine", choix), avancement]),
        ok: "Copier",
        valider: function () {
          if (!choix.value) throw new Error("Choisissez une tâche.");
          return Api.tout("etapes", { filter: "tache = " + Api.texteFiltre(choix.value), sort: "ordre,created" }).then(function (src) {
            if (!src.length) throw new Error("Cette tâche n'a pas d'étapes.");
            var base = etapes.length ? (etapes[etapes.length - 1].ordre || etapes.length * 10) : 0;
            var suite = Promise.resolve();
            src.forEach(function (s, k) {
              suite = suite.then(function () {
                avancement.textContent = "Copie de l'étape " + (k + 1) + " sur " + src.length + "…";
                var f = new FormData();
                f.append("tache", t.id);
                f.append("ordre", String(base + (k + 1) * 10));
                f.append("texte", s.texte || "");
                f.append("commande", s.commande || "");
                if (s.lien) f.append("lien", s.lien);
                var fichiers = (s.photos || []).map(function (n) { return ["photos", n]; });
                if (s.video) fichiers.push(["video", s.video]);
                return fichiers.reduce(function (p, fx) {
                  return p.then(function () {
                    return Api.urlFichier("etapes", s.id, fx[1]).then(function (u) { return fetch(u); }).then(function (r) {
                      if (!r.ok) throw new Error("Fichier illisible : " + fx[1]);
                      return r.blob();
                    }).then(function (b) { f.append(fx[0], b, fx[1]); });
                  });
                }, Promise.resolve()).then(function () {
                  return Api.creerFormulaire("etapes", f, function (r) {
                    avancement.textContent = "Copie de l'étape " + (k + 1) + " sur " + src.length + " : " + Math.round(r * 100) + " %";
                  });
                });
              });
            });
            return suite;
          });
        },
      }).then(function (ok) {
        if (ok) recharger();
      });
    });
  }

  window.Editeur = { tache: tache, procedure: procedure };
})();
