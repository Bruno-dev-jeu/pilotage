/// <reference path="../pb_data/types.d.ts" />

// Règles du Pilotage côté serveur (CDC chapitres 3.3, 4 et 6) :
//  1) chaque événement de l'historique (« Fait », « Reporter », « En
//     attente »…) met à jour sa tâche : prochaine échéance calculée,
//     date limite gardée lors d'un report, attente ouverte ou close ;
//  2) e-mail du matin à 7 h (heure de Paris) et résumé du lundi ;
//  3) route d'essai de l'e-mail, depuis les réglages.
// Rappel du piège connu (CDC PSV v2.14) : rien de déclaré en haut de
// fichier, chaque fonction charge ce dont elle a besoin par require().

onRecordCreateRequest((e) => {
  const P = require(`${__hooks}/pilotage.js`)
  P.avantHistorique(e.app, e.record)
  e.next()
  P.apresHistorique(e.app, e.record)
}, "historique")

// Toutes les 15 minutes de 5 h à 6 h 45 UTC : l'envoi part au premier
// passage où il est 7 h ou 8 h à Paris (heure d'été comme d'hiver), une
// seule fois par jour ; un échec est retenté au passage suivant.
cronAdd("pilotage_courriel_matin", "*/15 5,6 * * *", () => {
  const P = require(`${__hooks}/pilotage.js`)
  P.courrielDuMatin($app)
})

// Comptes rendus des contrôles de la nuit (script controles_nuit.py, root),
// protégés par le secret de /etc/pilotage/secret ; refusés par Caddy depuis
// Internet (CDC 5 et 8).
routerAdd("POST", "/api/pilotage/controles", (e) => {
  const P = require(`${__hooks}/pilotage.js`)
  return e.json(200, P.recevoirControles(e))
})

// Calendrier abonné (iPhone, iPad) : adresse secrète, titre et date seulement.
routerAdd("GET", "/api/pilotage/calendrier/{fichier}", (e) => {
  const P = require(`${__hooks}/pilotage.js`)
  return P.calendrier(e)
})

// Vérification immédiate de la sauvegarde du PC (depuis les réglages).
routerAdd("POST", "/api/pilotage/verifier-pc", (e) => {
  const P = require(`${__hooks}/pilotage.js`)
  return e.json(200, P.verifierPC(e.app))
}, $apis.requireAuth("users"))

routerAdd("POST", "/api/pilotage/essai-courriel", (e) => {
  const P = require(`${__hooks}/pilotage.js`)
  const r = P.envoyer(e.app, "essai")
  return e.json(r.ok ? 200 : 500, r)
}, $apis.requireAuth("users"))
