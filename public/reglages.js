// Réglages (#/reglages) : destinataire des e-mails et essai d'envoi,
// journal des derniers e-mails, domaines (ajout, nom, pictogramme, parent,
// ordre), compte et session de cet appareil (CDC 2, 6 et 8).
(function () {
  "use strict";

  var E = window.Echeances;
  var el = O.el;
  var VERSION_APPLI = "1.3.1";

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
      regles(contenu);
      surveillance(contenu);
      agenda(contenu);
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

  // ---------- règles de rappel (CDC 4.5) ----------

  var NOMS_PRIORITE = { critique: "🔴 Critique", important: "🟠 Important", confort: "⚪ Confort" };

  // ---------- surveillance et gel (CDC 4.4, 5 et 7) ----------

  function surveillance(zone) {
    var section = el("section", { classe: "carte" }, [el("h2", { texte: "🛡️ Surveillance et gel" }), O.attente()]);
    zone.appendChild(section);
    O.reglage(true).then(function (r) {
      section.removeChild(section.lastChild);
      var commune = el("input", { type: "text", maxlength: "100", valeur: r ? r.commune : "", placeholder: "Ex. Rognac 13340" });
      var ping = el("input", { type: "url", valeur: r ? r.ping_courriel : "", placeholder: "https://hc-ping.com/…", autocapitalize: "off", spellcheck: "false" });
      var hcCle = el("input", { type: "password", valeur: r ? r.healthchecks_api : "", autocomplete: "off", autocapitalize: "off", spellcheck: "false", placeholder: "Clé en lecture seule" });
      var hcPc = el("input", { type: "text", maxlength: "100", valeur: (r && r.healthchecks_pc) || "Sauvegarde PC" });
      var etat = el("p", { classe: "discret", "aria-live": "polite" });
      var lieu = r && r.meteo && r.meteo.nom && r.meteo.commune === r.commune ? "Commune trouvée : " + r.meteo.nom + "." : "";
      var enregistrer = el("button", { type: "button", classe: "bouton", texte: "Enregistrer" });
      enregistrer.addEventListener("click", function () {
        var p = ping.value.trim();
        if (p && p.indexOf("https://") !== 0) {
          etat.textContent = "L'adresse du signal de vie doit commencer par https://";
          return;
        }
        enregistrer.disabled = true;
        O.reglage(true).then(function (x) {
          var d = { commune: commune.value.trim().replace(/\s+/g, " "), ping_courriel: p, healthchecks_api: hcCle.value.trim(), healthchecks_pc: hcPc.value.trim() };
          if (!x) d.adresse_site = window.location.origin;
          return x ? Api.modifier("reglages", x.id, d) : Api.creer("reglages", d);
        }).then(function () {
          enregistrer.disabled = false;
          O.oublierTout();
          etat.textContent = "Enregistré ✓ La commune sera cherchée au prochain e-mail du matin.";
        }, function (e) {
          enregistrer.disabled = false;
          etat.textContent = "Non enregistré : " + e.message;
        });
      });
      [
        el("p", { classe: "aide", texte: "Les contrôles de la nuit (5 h) écrivent leurs comptes rendus dans l'écran « Contrôles », lien en haut de l'accueil." }),
        O.champ("Commune de la maison, pour l'alerte de gel", commune, "Nom et code postal, jamais l'adresse. Prévisions Open-Meteo, sans compte. " + lieu),
        O.champ("Signal de vie de l'e-mail du matin (Healthchecks.io)", ping, "Adresse « ping URL » du contrôle Healthchecks.io : si l'e-mail du matin ne part pas, Healthchecks.io vous prévient."),
        el("h3", { texte: "Sauvegarde du PC" }),
        el("p", { classe: "aide", texte: "Chaque matin, le Pilotage lit chez Healthchecks.io le signal envoyé dans la nuit par la sauvegarde du PC, et l'ajoute aux contrôles. Il faut une clé d'API en LECTURE SEULE : healthchecks.io › votre projet › Settings › API Access › « Create read-only API key »." }),
        O.champ("Clé d'API Healthchecks.io (lecture seule)", hcCle),
        O.champ("Nom du contrôle de la sauvegarde du PC", hcPc),
        enregistrer,
        el("button", { type: "button", classe: "bouton secondaire", texte: "💾 Vérifier la sauvegarde du PC maintenant", onclick: function () {
          etat.textContent = "Lecture chez Healthchecks.io…";
          Api.verifierPC().then(function (x) {
            var icone = { ok: "✅", info: "ℹ️", attention: "🟠", alerte: "🔴" }[x.statut] || "";
            etat.textContent = (icone ? icone + " " : "") + x.texte;
          }, function (e) {
            etat.textContent = "⚠️ " + e.message;
          });
        } }),
        el("a", { classe: "bouton secondaire", href: "#/controles", texte: "🛡️ Voir les contrôles de la nuit" }),
        etat,
      ].forEach(function (n) { section.appendChild(n); });
    }, function (e) {
      section.removeChild(section.lastChild);
      section.appendChild(O.erreur(e));
    });
  }

  // ---------- agenda de l'iPhone et de l'iPad (CDC 3.5) ----------

  function nouveauJeton() {
    var t = new Uint8Array(24);
    window.crypto.getRandomValues(t);
    return Array.prototype.map.call(t, function (o) { return (o < 16 ? "0" : "") + o.toString(16); }).join("");
  }

  function agenda(zone) {
    var section = el("section", { classe: "carte" }, [el("h2", { texte: "📅 Agenda de l'iPhone et de l'iPad" }), O.attente()]);
    zone.appendChild(section);
    O.reglage(true).then(function (r) {
      O.vider(section);
      section.appendChild(el("h2", { texte: "📅 Agenda de l'iPhone et de l'iPad" }));
      var etat = el("p", { classe: "discret", "aria-live": "polite" });
      function enregistrerJeton(j) {
        return O.reglage(true).then(function (x) {
          var d = { jeton_calendrier: j };
          if (!x) d.adresse_site = window.location.origin;
          return x ? Api.modifier("reglages", x.id, d) : Api.creer("reglages", d);
        }).then(function () {
          O.oublierTout();
          section.parentNode.replaceChild(el("div"), section);
          window.dispatchEvent(new HashChangeEvent("hashchange"));
        });
      }
      var jeton = r && r.jeton_calendrier;
      if (!jeton) {
        section.appendChild(el("p", { classe: "aide", texte: "Vos tâches peuvent apparaître dans l'app Calendrier de l'iPhone et de l'iPad, et s'y mettre à jour toutes seules. On crée d'abord une adresse secrète, que seul votre appareil connaîtra." }));
        section.appendChild(el("button", { type: "button", classe: "bouton", texte: "Créer l'adresse d'abonnement", onclick: function () {
          enregistrerJeton(nouveauJeton()).catch(function (e) { etat.textContent = "Impossible : " + e.message; });
        } }));
        section.appendChild(etat);
        return;
      }
      var chemin = window.location.host + "/api/pilotage/calendrier/" + jeton + ".ics";
      section.appendChild(el("ol", { classe: "aide etapes-agenda" }, [
        el("li", { texte: "Sur l'iPhone (puis sur l'iPad), touchez « S'abonner dans l'agenda » ci-dessous." }),
        el("li", { texte: "iOS propose « S'abonner au calendrier « Pilotage » » : touchez S'abonner, puis OK." }),
        el("li", { texte: "Les tâches apparaissent dans l'app Calendrier, sous le nom « Pilotage », et se mettent à jour toutes seules (quelques fois par jour). On coche « Fait » dans le Pilotage, pas dans le Calendrier." }),
      ]));
      section.appendChild(el("a", { classe: "bouton", href: "webcal://" + chemin, texte: "📅 S'abonner dans l'agenda" }));
      section.appendChild(el("button", { type: "button", classe: "bouton secondaire", texte: "Copier l'adresse (autre agenda)", onclick: function () {
        var adresse = "https://" + chemin;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(adresse).then(function () { etat.textContent = "Adresse copiée ✓ Ne la communiquez à personne."; }, function () { etat.textContent = adresse; });
        } else {
          etat.textContent = adresse;
        }
      } }));
      section.appendChild(el("p", { classe: "aide", texte: "L'agenda ne montre que le titre et la date de chaque tâche, jamais la procédure ni les justificatifs. Les rappels restent ceux de l'e-mail du matin ; pour une alerte sur le téléphone, réglez-la dans Réglages iOS › Calendrier." }));
      section.appendChild(el("button", { type: "button", classe: "bouton danger", texte: "Changer l'adresse (coupe les abonnements actuels)", onclick: function () {
        Dialogue.confirmer({
          titre: "Changer l'adresse de l'agenda ?",
          texte: "Les appareils déjà abonnés ne recevront plus rien : il faudra vous réabonner sur chacun. À faire si vous pensez que l'adresse a été vue par quelqu'un d'autre.",
          ok: "Changer l'adresse", annuler: "Garder", danger: true,
        }).then(function (oui) {
          if (oui) enregistrerJeton(nouveauJeton()).catch(function (e) { etat.textContent = "Impossible : " + e.message; });
        });
      } }));
      section.appendChild(etat);
    }, function (e) {
      O.vider(section);
      section.appendChild(O.erreur(e));
    });
  }

  function regles(zone) {
    var section = el("section", { classe: "carte" }, [el("h2", { texte: "🔔 Règles de rappel" }), O.attente()]);
    zone.appendChild(section);
    O.reglage(true).then(function (reglage) {
      section.removeChild(section.lastChild);
      var R = E.regles(reglage && reglage.regles);
      var champs = {};
      section.appendChild(el("p", { classe: "aide", texte: "Les trois priorités restent les mêmes ; vous réglez ici quand elles vous préviennent. Le résumé du lundi reprend toujours tout." }));
      ["critique", "important", "confort"].forEach(function (p) {
        var retard = el("input", { type: "number", inputmode: "numeric", min: "0", max: "30", valeur: String(R[p].retard) });
        var matin = el("input", { type: "checkbox", coche: R[p].matin, id: "matin-" + p });
        champs[p] = { retard: retard, matin: matin };
        section.appendChild(el("div", { classe: "regle-priorite" }, [
          el("h3", { texte: NOMS_PRIORITE[p] }),
          O.champ("En retard : rappel tous les … jours", retard, "1 = chaque jour ; 3 = tous les 3 jours ; 0 = seulement dans le résumé du lundi."),
          el("label", { classe: "case-ligne", "for": "matin-" + p }, [matin, " Premier rappel et jour J dans l'e-mail du matin (sinon : le lundi seulement)"]),
        ]));
      });
      var avance = el("input", { type: "number", inputmode: "numeric", min: "1", max: "365", valeur: String(R.avance) });
      var avanceAn = el("input", { type: "number", inputmode: "numeric", min: "1", max: "365", valeur: String(R.avance_annuelle) });
      var tolerance = el("input", { type: "number", inputmode: "numeric", min: "0", max: "365", valeur: String(R.tolerance) });
      var etat = el("p", { classe: "discret", "aria-live": "polite" });
      var enregistrer = el("button", { type: "button", classe: "bouton", texte: "Enregistrer les règles" });
      section.appendChild(el("h3", { texte: "Pour toutes les priorités" }));
      section.appendChild(el("div", { classe: "champs" }, [
        O.champ("Premier rappel, jours avant", avance),
        O.champ("Tâche annuelle, jours avant", avanceAn),
      ]));
      section.appendChild(el("p", { classe: "aide", texte: "Une tâche peut avoir son propre premier rappel (ex. 90 jours pour une carte d'identité) : il passe avant ces valeurs." }));
      section.appendChild(O.champ("Tolérance proposée pour une nouvelle tâche souple, en jours", tolerance));
      section.appendChild(enregistrer);
      section.appendChild(el("button", { type: "button", classe: "bouton secondaire", texte: "Revenir aux règles d'origine", onclick: function () {
        var d = E.REGLES_DEFAUT;
        ["critique", "important", "confort"].forEach(function (p) {
          champs[p].retard.value = String(d[p].retard);
          champs[p].matin.checked = d[p].matin;
        });
        avance.value = String(d.avance);
        avanceAn.value = String(d.avance_annuelle);
        tolerance.value = String(d.tolerance);
        etat.textContent = "Valeurs d'origine remises : touchez « Enregistrer les règles » pour les garder.";
      } }));
      section.appendChild(etat);
      enregistrer.addEventListener("click", function () {
        var brut = { avance: avance.value, avance_annuelle: avanceAn.value, tolerance: tolerance.value };
        ["critique", "important", "confort"].forEach(function (p) {
          brut[p] = { retard: champs[p].retard.value, matin: champs[p].matin.checked };
        });
        var propres = E.regles(brut);
        enregistrer.disabled = true;
        O.reglage(true).then(function (r) {
          var d = { regles: propres };
          if (!r) d.adresse_site = window.location.origin;
          return r ? Api.modifier("reglages", r.id, d) : Api.creer("reglages", d);
        }).then(function () {
          enregistrer.disabled = false;
          O.oublierTout();
          etat.textContent = "Règles enregistrées ✓ Elles s'appliquent dès le prochain e-mail du matin.";
        }, function (e) {
          enregistrer.disabled = false;
          etat.textContent = "Non enregistrées : " + e.message;
        });
      });
    }, function (e) {
      section.removeChild(section.lastChild);
      section.appendChild(O.erreur(e));
    });
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
