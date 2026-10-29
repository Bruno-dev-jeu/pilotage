/// <reference path="../pb_data/types.d.ts" />

// Étape 2 du Pilotage (CDC chapitre 5, 29/10/2026) :
//  - collection « controles » : comptes rendus en clair des contrôles de la
//    nuit, écrits seulement par le serveur (route protégée par un secret),
//    gardés 90 jours ;
//  - taches.origine : tâche créée par un contrôle (pas de doublon) ;
//  - taches.alerte_gel : prévenir quand le gel est annoncé (piscine) ;
//  - reglages.commune, reglages.meteo (position trouvée), reglages.ping_courriel
//    (signal de vie Healthchecks.io après l'e-mail du matin).
const FOYER = '@request.auth.collectionName = "users"'

migrate((app) => {
  try {
    app.findCollectionByNameOrId("controles")
  } catch (e) {
    const c = new Collection({ type: "base", name: "controles", listRule: FOYER, viewRule: FOYER, createRule: null, updateRule: null, deleteRule: null })
    c.fields.add(new TextField({
      name: "nuit", required: true, max: 10,
      help: "Nuit du contrôle, jour à Paris au format AAAA-MM-JJ. Ex. 2026-10-30.",
    }))
    c.fields.add(new TextField({
      name: "cle", required: true, max: 60,
      help: "Code du contrôle, pour les regrouper d'une nuit à l'autre. Ex. certificats, sauvegarde-psv, disque.",
    }))
    c.fields.add(new TextField({
      name: "titre", required: true, max: 120,
      help: "Nom du contrôle en clair. Ex. Certificats HTTPS, Sauvegarde de PSV.",
    }))
    c.fields.add(new SelectField({
      name: "statut", required: true, maxSelect: 1, values: ["ok", "info", "attention", "alerte"],
      help: "ok : tout va bien ; info : à savoir, rien à faire ; attention : à regarder sans urgence ; alerte : à réparer (une tâche critique est créée).",
    }))
    c.fields.add(new TextField({
      name: "texte", required: true, max: 3000,
      help: "Compte rendu compréhensible sans connaissance technique : ce qui a été vérifié ou fait, ce que ça veut dire, s'il y a quelque chose à faire.",
    }))
    c.fields.add(new AutodateField({ name: "created", onCreate: true, onUpdate: false }))
    c.fields.add(new AutodateField({ name: "updated", onCreate: true, onUpdate: true }))
    c.indexes = ["CREATE INDEX idx_controles_nuit ON controles (nuit)"]
    app.save(c)
  }

  const taches = app.findCollectionByNameOrId("taches")
  if (!taches.fields.getByName("origine")) {
    taches.fields.add(new TextField({
      name: "origine", required: false, max: 80,
      help: "Tâche créée par un contrôle de la nuit : son code, pour ne pas la créer deux fois. Vide pour une tâche saisie à la main. Ex. controle:certificats.",
    }))
  }
  if (!taches.fields.getByName("alerte_gel")) {
    taches.fields.add(new BoolField({
      name: "alerte_gel", required: false,
      help: "Coché : l'e-mail du matin prévient quand le gel est annoncé à la maison dans les 7 jours, tant que la tâche n'est pas faite. Ex. hiverner la piscine.",
    }))
  }
  app.save(taches)

  const reglages = app.findCollectionByNameOrId("reglages")
  if (!reglages.fields.getByName("commune")) {
    reglages.fields.add(new TextField({
      name: "commune", required: false, max: 100,
      help: "Commune de la maison, pour l'alerte de gel (prévisions Open-Meteo, sans compte). Nom et code postal. Ex. Rognac 13340. Jamais l'adresse.",
    }))
  }
  if (!reglages.fields.getByName("meteo")) {
    reglages.fields.add(new JSONField({
      name: "meteo", required: false, maxSize: 2000,
      help: "Usage interne : position de la commune trouvée par Open-Meteo (nom, latitude, longitude), pour ne pas la chercher chaque matin.",
    }))
  }
  if (!reglages.fields.getByName("ping_courriel")) {
    reglages.fields.add(new URLField({
      name: "ping_courriel", required: false,
      help: "Adresse de signal de vie Healthchecks.io appelée après l'e-mail du matin. Si le signal manque, Healthchecks.io vous écrit. Ex. https://hc-ping.com/…",
    }))
  }
  app.save(reglages)

  // Alerte de gel pour l'hivernage de la piscine (réponse du 23/10/2026).
  app.findRecordsByFilter("taches", "titre = 'Hiverner la piscine'", "", 5, 0).forEach((t) => {
    t.set("alerte_gel", true)
    app.save(t)
  })
}, (app) => {
  try {
    app.delete(app.findCollectionByNameOrId("controles"))
  } catch (e) {
    // déjà absente
  }
})
