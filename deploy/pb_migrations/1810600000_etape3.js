/// <reference path="../pb_data/types.d.ts" />

// Étape 3 du Pilotage (CDC 3.5 et 5.1, 29/10/2026) :
//  - jeton_calendrier : adresse secrète de l'abonnement du calendrier
//    (iPhone, iPad), révocable en la changeant ;
//  - healthchecks_api, healthchecks_pc : lecture, chez Healthchecks.io, du
//    signal envoyé chaque nuit par la sauvegarde du PC (clé en lecture seule).
migrate((app) => {
  const reglages = app.findCollectionByNameOrId("reglages")
  if (!reglages.fields.getByName("jeton_calendrier")) {
    reglages.fields.add(new TextField({
      name: "jeton_calendrier", required: false, max: 100,
      help: "Partie secrète de l'adresse d'abonnement du calendrier (iPhone, iPad). Créée et changée dans Réglages ; la changer coupe les anciens abonnements. Vide : pas d'abonnement.",
    }))
  }
  if (!reglages.fields.getByName("healthchecks_api")) {
    reglages.fields.add(new TextField({
      name: "healthchecks_api", required: false, max: 100,
      help: "Clé d'API Healthchecks.io EN LECTURE SEULE (Settings > API Access > read-only), pour lire chaque matin le signal de la sauvegarde du PC. Elle ne permet de rien modifier.",
    }))
  }
  if (!reglages.fields.getByName("healthchecks_pc")) {
    reglages.fields.add(new TextField({
      name: "healthchecks_pc", required: false, max: 100,
      help: "Nom exact du contrôle Healthchecks.io de la sauvegarde du PC. Ex. Sauvegarde PC.",
    }))
  }
  app.save(reglages)
}, (app) => {
  const reglages = app.findCollectionByNameOrId("reglages")
  ;["jeton_calendrier", "healthchecks_api", "healthchecks_pc"].forEach((n) => {
    const f = reglages.fields.getByName(n)
    if (f) reglages.fields.removeById(f.id)
  })
  app.save(reglages)
})
