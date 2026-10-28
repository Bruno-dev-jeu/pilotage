// Fiche d'une tâche (#/tache/ID, CDC 3.3) : échéance, souplesse, condition,
// préparation, attente, procédure pas à pas (cases gardées sur l'appareil),
// matériel, contacts, historique avec justificatifs, et les boutons
// « Fait », « Reporter », « En attente de… ». Les calculs de dates sont faits
// par le serveur à l'enregistrement de l'événement (pilotage.js).
(function () {
  "use strict";

  var E = window.Echeances;
  var el = O.el;

  var TYPES = {
    fait: "✅ Fait", report: "📅 Reporté", attente: "⏳ Mise en attente", relance: "📨 Relance faite",
    fin_attente: "▶️ Fin de l'attente", preparation: "📞 Préparation faite", note: "📝 Note",
  };

  // ---------- cases de la procédure (commodité, sur cet appareil) ----------

  function lireCases(id) {
    try {
      return JSON.parse(window.localStorage.getItem("pilotage.cases." + id) || "[]");
    } catch (e) {
      return [];
    }
  }

  function ecrireCases(id, liste) {
    try {
      if (liste.length) window.localStorage.setItem("pilotage.cases." + id, JSON.stringify(liste));
      else window.localStorage.removeItem("pilotage.cases." + id);
    } catch (e) {
      // stockage indisponible
    }
  }

  // ---------- visionneuse de photo ----------

  function visionneuse(url) {
    var fond = el("div", { classe: "visionneuse", role: "dialog", "aria-modal": "true", "aria-label": "Photo" });
    function fermer() {
      document.removeEventListener("keydown", touche, true);
      document.body.classList.remove("sans-defilement");
      if (fond.parentNode) fond.parentNode.removeChild(fond);
    }
    function touche(ev) {
      if (ev.key === "Escape") fermer();
    }
    fond.appendChild(el("div", { classe: "visionneuse-barre" }, [
      el("button", { type: "button", classe: "bouton petit", texte: "✕ Fermer", onclick: fermer }),
    ]));
    fond.appendChild(el("div", { classe: "visionneuse-image" }, [el("img", { src: url, alt: "" })]));
    document.addEventListener("keydown", touche, true);
    document.body.appendChild(fond);
    document.body.classList.add("sans-defilement");
    fond.querySelector("button").focus();
  }

  // Lien vers un fichier protégé : l'adresse (jeton de 2 minutes) est
  // renouvelée régulièrement tant que le lien est affiché.
  function lienFichier(collection, id, nom, texte) {
    var a = el("a", { href: "#", target: "_blank", rel: "noopener", classe: "fichier", texte: texte || nom });
    function maj() {
      if (!a.isConnected && a.dataset.pose) return;
      a.dataset.pose = "1";
      Api.urlFichier(collection, id, nom).then(function (u) { a.href = u; }, function () {});
      setTimeout(maj, 80000);
    }
    maj();
    return a;
  }

  // ---------- fenêtres d'action ----------

  function champDate(valeur) {
    return el("input", { type: "date", valeur: valeur || "" });
  }

  function texteLong(valeur, lignes) {
    return el("textarea", { rows: String(lignes || 3), valeur: valeur || "" });
  }

  function envoyerEvenement(tache, champs, fichiers, surAvancement) {
    var f = new FormData();
    f.append("tache", tache.id);
    Object.keys(champs).forEach(function (k) {
      if (champs[k] !== undefined && champs[k] !== null && champs[k] !== "") f.append(k, champs[k]);
    });
    (fichiers || []).forEach(function (x) { f.append("justificatifs", x.blob, x.nom); });
    return Api.creerFormulaire("historique", f, surAvancement);
  }

  // Justificatifs choisis : photos réduites, PDF tels quels (20 Mo au plus).
  function preparerJustificatifs(liste) {
    return Promise.all(Array.prototype.map.call(liste || [], function (x, i) {
      if (/^image\//.test(x.type) && !/heic/i.test(x.type)) {
        return O.photoReduite(x).then(function (b) { return { blob: b, nom: O.nomFichier("justificatif-" + (i + 1), "jpg") }; });
      }
      if (x.size > 20971520) return Promise.reject(new Error("« " + x.name + " » dépasse 20 Mo."));
      return { blob: x, nom: x.name };
    }));
  }

  function fait(tache, recharger) {
    var auj = E.aujourdhui();
    var date = champDate(auj);
    date.max = auj;
    var remarque = texteLong("", 2);
    var duree = el("input", { type: "number", min: "0", inputmode: "numeric", placeholder: "Ex. 45" });
    var cout = el("input", { type: "number", min: "0", step: "0.01", inputmode: "decimal", placeholder: "Ex. 75,50" });
    var fichiers = el("input", { type: "file", accept: "image/*,application/pdf", multiple: "multiple" });
    var avancement = el("p", { classe: "discret", "aria-live": "polite" });
    var contenu = el("div", { classe: "formulaire" }, [
      O.champ("Date de réalisation", date),
      O.champ("Remarque (facultatif)", remarque),
      el("div", { classe: "champs" }, [O.champ("Durée en minutes", duree), O.champ("Coût en euros", cout)]),
      O.champ("Justificatifs : certificat, procès-verbal, facture (facultatif)", fichiers, "Photo ou PDF. Les photos sont réduites avant l'envoi."),
      avancement,
    ]);
    var resultat = null;
    return Dialogue.formulaire({
      titre: "✅ " + tache.titre, contenu: contenu, ok: "Enregistrer",
      valider: function () {
        if (!date.value) throw new Error("Indiquez la date de réalisation.");
        if (date.value > auj) throw new Error("La date ne peut pas être dans le futur.");
        avancement.textContent = "Préparation…";
        return preparerJustificatifs(fichiers.files).then(function (pj) {
          return envoyerEvenement(tache, {
            type: "fait", date: O.dateBase(date.value), remarque: remarque.value.trim(),
            duree: duree.value, cout: cout.value.replace(",", "."),
          }, pj, function (r) { avancement.textContent = "Envoi : " + Math.round(r * 100) + " %"; });
        }).then(function (h) {
          resultat = h;
        }, function (e) {
          avancement.textContent = "";
          throw e;
        });
      },
    }).then(function (ok) {
      if (!ok) return;
      ecrireCases(tache.id, []);
      O.oublier();
      var prochaine = E.jour(resultat && resultat.nouvelle_echeance);
      Dialogue.informer({
        titre: "C'est noté",
        texte: tache.mode === "unique" ? "Tâche terminée." : prochaine ? "Prochaine échéance : " + O.dateLongue(prochaine) + "." : "Prochaine échéance à compléter dans la fiche.",
      }).then(recharger);
    });
  }

  function reporter(tache, recharger) {
    var date = champDate("");
    date.min = E.aujourdhui();
    var raison = texteLong("", 3);
    var contenu = el("div", { classe: "formulaire" }, [
      tache.souplesse === "imperative" ? el("p", { classe: "message", texte: "🔒 Date impérative : la date limite d'origine restera affichée en rouge sur la fiche." }) : null,
      O.champ("Nouvelle date", date),
      O.champ("Raison du report (obligatoire, gardée dans l'historique)", raison),
    ]);
    return Dialogue.formulaire({
      titre: "📅 Reporter", contenu: contenu, ok: "Reporter",
      valider: function () {
        if (!date.value) throw new Error("Indiquez la nouvelle date.");
        if (!raison.value.trim()) throw new Error("Indiquez la raison du report.");
        return envoyerEvenement(tache, { type: "report", date: O.dateBase(E.aujourdhui()), nouvelle_echeance: O.dateBase(date.value), remarque: raison.value.trim() });
      },
    }).then(function (ok) {
      if (ok) {
        O.oublier();
        recharger();
      }
    });
  }

  function mettreEnAttente(tache, recharger) {
    var quoi = texteLong("", 2);
    quoi.placeholder = "Ex. Réponse du garage pour un rendez-vous";
    var date = champDate(E.ajouterJours(E.aujourdhui(), 7));
    var contenu = el("div", { classe: "formulaire" }, [
      O.champ("Ce que vous attendez, et de qui", quoi),
      O.champ("Date de relance : ce jour-là, rappel « relancer ou décider »", date),
    ]);
    return Dialogue.formulaire({
      titre: "⏳ En attente de…", contenu: contenu, ok: "Enregistrer",
      valider: function () {
        if (!quoi.value.trim()) throw new Error("Indiquez ce que vous attendez.");
        if (!date.value) throw new Error("Indiquez la date de relance.");
        return envoyerEvenement(tache, { type: "attente", date: O.dateBase(E.aujourdhui()), nouvelle_echeance: O.dateBase(date.value), remarque: quoi.value.trim() });
      },
    }).then(function (ok) {
      if (ok) {
        O.oublier();
        recharger();
      }
    });
  }

  function relance(tache, recharger) {
    var date = champDate(E.ajouterJours(E.aujourdhui(), 7));
    var remarque = texteLong("", 2);
    var contenu = el("div", { classe: "formulaire" }, [
      O.champ("Prochaine date de relance", date),
      O.champ("Remarque (facultatif)", remarque),
    ]);
    return Dialogue.formulaire({
      titre: "📨 Relance faite", contenu: contenu, ok: "Enregistrer",
      valider: function () {
        if (!date.value) throw new Error("Indiquez la prochaine date de relance.");
        return envoyerEvenement(tache, { type: "relance", date: O.dateBase(E.aujourdhui()), nouvelle_echeance: O.dateBase(date.value), remarque: remarque.value.trim() });
      },
    }).then(function (ok) {
      if (ok) {
        O.oublier();
        recharger();
      }
    });
  }

  function simple(tache, type, titreFenetre, texte, recharger) {
    var remarque = texteLong("", 2);
    return Dialogue.formulaire({
      titre: titreFenetre, texte: texte, contenu: el("div", { classe: "formulaire" }, [O.champ("Remarque (facultatif)", remarque)]), ok: "Enregistrer",
      valider: function () {
        return envoyerEvenement(tache, { type: type, date: O.dateBase(E.aujourdhui()), remarque: remarque.value.trim() });
      },
    }).then(function (ok) {
      if (ok) {
        O.oublier();
        recharger();
      }
    });
  }

  // ---------- écran ----------

  function vue(zone, a) {
    var id = a.chemin[1];
    O.titre("Tâche");
    zone.appendChild(O.barreFermer("#/accueil"));
    var contenu = el("div", {}, [O.attente()]);
    zone.appendChild(contenu);
    function charger() {
      Promise.all([
        Api.un("taches", id),
        Api.tout("etapes", { filter: "tache = " + Api.texteFiltre(id), sort: "ordre,created" }),
        Api.tout("historique", { filter: "tache = " + Api.texteFiltre(id), sort: "-date,-created" }, 500),
      ]).then(function (r) {
        O.vider(contenu);
        dessiner(contenu, r[0], r[1], r[2], charger);
      }, function (e) {
        O.vider(contenu);
        contenu.appendChild(e && e.statut === 404 ? el("p", { classe: "message", texte: "Cette tâche n'existe plus." }) : O.erreur(e));
      });
    }
    charger();
  }

  function bloc(titreBloc, texte) {
    if (!texte || !String(texte).trim()) return null;
    return el("section", { classe: "carte" }, [el("h2", { texte: titreBloc }), el("p", { classe: "texte-libre", texte: texte })]);
  }

  function dessiner(zone, t, etapes, historique, recharger) {
    var auj = E.aujourdhui();
    O.titre(O.nomDomaine(t.domaine, true) || "Tâche");
    var els = E.elements(t, auj);
    els.forEach(function (x) { x.groupe = E.classer(x, auj); });
    var principal = els.filter(function (x) { return x.type !== "preparation"; })[0];
    var prep = els.filter(function (x) { return x.type === "preparation"; })[0];

    // En-tête
    zone.appendChild(el("h2", { classe: "titre-tache", texte: t.titre }));
    zone.appendChild(el("p", { classe: "discret", texte: O.nomDomaine(t.domaine) }));
    var reference = t.mode === "reference";
    zone.appendChild(el("div", { classe: "pastilles" }, reference ? [
      el("span", { classe: "pastille", texte: O.frequence(t) }),
    ] : [
      el("span", { classe: "pastille " + t.priorite, texte: (O.PRIORITES.filter(function (p) { return p[0] === t.priorite; })[0] || ["", ""])[1] }),
      el("span", { classe: "pastille", texte: O.souplesse(t) }),
      el("span", { classe: "pastille", texte: O.frequence(t) }),
    ]));

    // État
    var etat = [];
    if (t.etat === "terminee") {
      etat.push(el("p", { classe: "grand", texte: "✅ Terminée" + (t.derniere_realisation ? " le " + E.format(t.derniere_realisation) : "") }));
    } else if (principal) {
      etat.push(el("p", { classe: "grand" + (principal.groupe === "retard" ? " retard" : ""), texte: (principal.type === "a_completer" ? "📝 " : "") + E.libelle(principal, auj).replace(/^./, function (c) { return c.toUpperCase(); }) }));
      if (principal.type === "a_completer") etat.push(el("p", { classe: "discret", texte: "Date inconnue : indiquez-la avec « Modifier » pour recevoir les rappels." }));
    }
    var dl = E.jour(t.date_limite);
    if (t.souplesse === "imperative" && dl && dl !== E.jour(t.echeance) && t.etat !== "terminee") {
      etat.push(el("p", { classe: "limite", texte: "🔒 Date limite d'origine : " + E.format(dl) + (dl < auj ? " (dépassée)" : "") }));
    }
    if (t.derniere_realisation) etat.push(el("p", { classe: "discret", texte: "Dernière réalisation : " + O.dateLongue(t.derniere_realisation) }));
    if (etat.length) zone.appendChild(el("section", { classe: "carte etat" }, etat));

    if (t.condition) zone.appendChild(el("p", { classe: "condition", texte: "👁 " + t.condition }));

    // Attente
    if (t.etat === "attente") {
      zone.appendChild(el("section", { classe: "carte attente-bloc" }, [
        el("h2", { texte: "⏳ En attente" }),
        el("p", { classe: "texte-libre", texte: t.attente_quoi || "—" }),
        el("p", { classe: "discret", texte: t.attente_relance ? "Relance prévue le " + O.dateLongue(t.attente_relance) : "Pas de date de relance." }),
        el("div", { classe: "actions-2" }, [
          el("button", { type: "button", classe: "bouton secondaire", texte: "📨 Relance faite", onclick: function () { relance(t, recharger); } }),
          el("button", { type: "button", classe: "bouton secondaire", texte: "▶️ Fin de l'attente", onclick: function () {
            simple(t, "fin_attente", "▶️ Fin de l'attente", "La tâche redevient active, avec son échéance.", recharger);
          } }),
        ]),
      ]));
    }

    // Préparation
    if (t.preparation && t.etat !== "terminee" && !reference) {
      var pj = parseInt(t.preparation_jours, 10) || 0;
      var e = E.jour(t.echeance);
      var lignesPrep = [
        el("h2", { texte: "📞 Préparation" }),
        el("p", { classe: "texte-libre", texte: t.preparation }),
        el("p", { classe: "discret", texte: pj + " jours avant" + (e ? ", à partir du " + E.format(E.ajouterJours(e, -pj)) : "") + (t.preparation_faite ? " · ✅ faite pour cette échéance" : "") }),
      ];
      if (prep) {
        lignesPrep.push(el("button", { type: "button", classe: "bouton", texte: "✅ Préparation faite", onclick: function () {
          simple(t, "preparation", "📞 " + t.preparation, "Par exemple : date du rendez-vous obtenu.", recharger);
        } }));
      }
      zone.appendChild(el("section", { classe: "carte" + (prep && prep.groupe === "retard" ? " en-retard" : "") }, lignesPrep));
    }

    // Boutons (pas pour une fiche de référence : ni date ni rappel)
    if (t.etat !== "terminee" && !reference) {
      zone.appendChild(el("div", { classe: "actions-principales" }, [
        el("button", { type: "button", classe: "bouton", texte: "✅ Fait", onclick: function () { fait(t, recharger); } }),
        el("button", { type: "button", classe: "bouton secondaire", texte: "📅 Reporter", onclick: function () { reporter(t, recharger); } }),
        t.etat !== "attente" ? el("button", { type: "button", classe: "bouton secondaire", texte: "⏳ En attente de…", onclick: function () { mettreEnAttente(t, recharger); } }) : null,
      ]));
    }

    // Procédure
    zone.appendChild(procedure(t, etapes));

    [bloc("🧰 Matériel ou produits", t.materiel), bloc("📇 Contacts utiles", t.contacts), bloc("📝 Notes", t.notes)].forEach(function (b) {
      if (b) zone.appendChild(b);
    });

    zone.appendChild(el("div", { classe: "actions-2" }, [
      el("a", { classe: "bouton secondaire", href: "#/modifier/" + t.id, texte: "✏️ Modifier la fiche" }),
      el("button", { type: "button", classe: "bouton secondaire", texte: "📝 Ajouter une note", onclick: function () {
        simple(t, "note", "📝 Note", "Remarque gardée dans l'historique, sans changer l'échéance.", recharger);
      } }),
    ]));

    zone.appendChild(historiqueBloc(t, historique, recharger));
  }

  function procedure(t, etapes) {
    var section = el("section", { classe: "carte procedure" });
    var tete = el("div", { classe: "tete-section" }, [el("h2", { texte: "📋 Procédure" })]);
    section.appendChild(tete);
    if (!etapes.length) {
      section.appendChild(el("p", { classe: "discret", texte: "Pas encore de procédure. Ajoutez les étapes, avec photos ou vidéo, pour savoir quoi faire la prochaine fois." }));
      section.appendChild(el("a", { classe: "bouton secondaire", href: "#/procedure/" + t.id, texte: "✏️ Écrire la procédure" }));
      return section;
    }
    var cochees = lireCases(t.id);
    var compte = el("span", { classe: "discret" });
    tete.appendChild(compte);
    function majCompte() {
      var n = etapes.filter(function (x) { return cochees.indexOf(x.id) >= 0; }).length;
      compte.textContent = n + " / " + etapes.length;
    }
    var ol = el("ol", { classe: "etapes" });
    etapes.forEach(function (x, i) {
      var c = el("input", { type: "checkbox", coche: cochees.indexOf(x.id) >= 0, "aria-label": "Étape " + (i + 1) + " faite" });
      var li = el("li", { classe: c.checked ? "cochee" : "" });
      c.addEventListener("change", function () {
        cochees = cochees.filter(function (k) { return k !== x.id; });
        if (c.checked) cochees.push(x.id);
        li.className = c.checked ? "cochee" : "";
        ecrireCases(t.id, cochees);
        majCompte();
      });
      var corps = el("div", { classe: "etape-corps" }, [
        el("span", { classe: "etape-num", texte: "Étape " + (i + 1) }),
        x.texte ? el("p", { classe: "texte-libre", texte: x.texte }) : null,
      ]);
      if (x.commande) {
        var pre = el("pre", { classe: "commande", texte: x.commande });
        var copier = el("button", { type: "button", classe: "bouton secondaire petit", texte: "Copier" });
        copier.addEventListener("click", function () {
          var fini = function () {
            copier.textContent = "Copié ✓";
            setTimeout(function () { copier.textContent = "Copier"; }, 2000);
          };
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(x.commande).then(fini, function () { selectionner(pre); });
          } else {
            selectionner(pre);
          }
        });
        corps.appendChild(el("div", { classe: "bloc-commande" }, [pre, copier]));
      }
      if (x.photos && x.photos.length) {
        var galerie = el("div", { classe: "galerie" });
        x.photos.forEach(function (nom) {
          var img = el("img", { alt: "Photo de l'étape " + (i + 1), loading: "lazy" });
          var b = el("button", { type: "button", classe: "vignette", "aria-label": "Agrandir la photo" }, [img]);
          Api.urlFichier("etapes", x.id, nom, "thumb=400x0").then(function (u) { img.src = u; }, function () {});
          b.addEventListener("click", function () {
            Api.urlFichier("etapes", x.id, nom).then(visionneuse, function () {});
          });
          galerie.appendChild(b);
        });
        corps.appendChild(galerie);
      }
      if (x.video) {
        var v = el("video", { controls: "controls", playsinline: "playsinline", preload: "metadata" });
        Api.urlFichier("etapes", x.id, x.video).then(function (u) { v.src = u; }, function () {});
        corps.appendChild(v);
      }
      if (x.lien) corps.appendChild(el("a", { href: x.lien, target: "_blank", rel: "noopener noreferrer", classe: "lien-externe", texte: "🔗 " + x.lien }));
      li.appendChild(el("label", { classe: "etape-case" }, [c]));
      li.appendChild(corps);
      ol.appendChild(li);
    });
    section.appendChild(ol);
    majCompte();
    section.appendChild(el("div", { classe: "actions-2" }, [
      el("button", { type: "button", classe: "bouton secondaire", texte: "Tout décocher", onclick: function () {
        cochees = [];
        ecrireCases(t.id, []);
        Array.prototype.forEach.call(ol.querySelectorAll("input[type=checkbox]"), function (c) { c.checked = false; });
        Array.prototype.forEach.call(ol.children, function (li) { li.className = ""; });
        majCompte();
      } }),
      el("a", { classe: "bouton secondaire", href: "#/procedure/" + t.id, texte: "✏️ Modifier la procédure" }),
    ]));
    return section;
  }

  function selectionner(n) {
    var r = document.createRange();
    r.selectNodeContents(n);
    var s = window.getSelection();
    s.removeAllRanges();
    s.addRange(r);
  }

  function historiqueBloc(t, historique, recharger) {
    var section = el("section", { classe: "carte" }, [el("h2", { texte: "🕘 Historique" })]);
    if (!historique.length) {
      section.appendChild(el("p", { classe: "discret", texte: "Rien pour l'instant." }));
      return section;
    }
    var ul = el("ul", { classe: "historique" });
    historique.forEach(function (h) {
      var details = [];
      if (h.type === "report" && h.nouvelle_echeance) details.push("du " + E.format(h.ancienne_echeance) + " au " + E.format(h.nouvelle_echeance));
      if (h.type === "fait" && h.nouvelle_echeance) details.push("prochaine : " + E.format(h.nouvelle_echeance));
      if ((h.type === "attente" || h.type === "relance") && h.nouvelle_echeance) details.push("relance le " + E.format(h.nouvelle_echeance));
      if (h.duree) details.push(h.duree + " min");
      if (h.cout) details.push(String(h.cout).replace(".", ",") + " €");
      var li = el("li", {}, [
        el("div", { classe: "historique-tete" }, [
          el("strong", { texte: (TYPES[h.type] || h.type) + " · " + E.format(h.date) }),
          el("button", { type: "button", classe: "lien", texte: "Supprimer", "aria-label": "Supprimer cette ligne de l'historique", onclick: function () {
            Dialogue.confirmer({
              titre: "Supprimer cette ligne ?",
              texte: "La ligne et ses justificatifs seront effacés.\nL'échéance de la tâche ne change pas : corrigez-la avec « Modifier la fiche » si besoin.",
              ok: "Supprimer", annuler: "Garder", danger: true,
            }).then(function (oui) {
              if (!oui) return;
              Api.supprimer("historique", h.id).then(recharger, function (e) {
                Dialogue.informer({ titre: "Suppression impossible", texte: e.message });
              });
            });
          } }),
        ]),
        details.length ? el("p", { classe: "discret", texte: details.join(" · ") }) : null,
        h.remarque ? el("p", { classe: "texte-libre", texte: h.remarque }) : null,
      ]);
      if (h.justificatifs && h.justificatifs.length) {
        li.appendChild(el("div", { classe: "justificatifs" }, h.justificatifs.map(function (nom) {
          return lienFichier("historique", h.id, nom, "📎 " + nom.replace(/_[a-z0-9]{10}(\.[a-z0-9]+)$/i, "$1"));
        })));
      }
      ul.appendChild(li);
    });
    section.appendChild(ul);
    return section;
  }

  window.Fiche = { vue: vue };
})();
