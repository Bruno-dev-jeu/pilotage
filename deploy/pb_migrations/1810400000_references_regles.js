/// <reference path="../pb_data/types.d.ts" />

// Évolutions validées le 28/10/2026 (CDC 0.9) :
//  1) fiches de référence, sans échéance ni rappel : nouvelle valeur
//     « reference » du mode des tâches ;
//  2) règles de rappel réglables pour chacune des trois priorités : champ
//     JSON « regles » des réglages (vide : règles d'origine du CDC 4.5).
migrate((app) => {
  const taches = app.findCollectionByNameOrId("taches")
  const mode = taches.fields.getByName("mode")
  if (mode.values.indexOf("reference") < 0) {
    mode.values = ["apres", "fixe", "unique", "reference"]
    mode.help = "apres : intervalle depuis la dernière réalisation (adoucisseur) ; fixe : dates du calendrier (revue en janvier, avril…) ; unique : une seule fois ; reference : fiche de référence, sans échéance ni rappel (où sont les vannes d'eau)."
    app.save(taches)
  }

  const reglages = app.findCollectionByNameOrId("reglages")
  if (!reglages.fields.getByName("regles")) {
    reglages.fields.add(new JSONField({
      name: "regles", required: false, maxSize: 2000,
      help: "Règles de rappel, réglées dans l'écran Réglages. Par priorité : retard (rappel tous les N jours, 0 = lundi seulement) et matin (jour J dans l'e-mail du matin) ; avance, avance_annuelle, tolerance en jours. Vide : règles d'origine.",
    }))
    app.save(reglages)
  }
}, (app) => {
  const reglages = app.findCollectionByNameOrId("reglages")
  const f = reglages.fields.getByName("regles")
  if (f) {
    reglages.fields.removeById(f.id)
    app.save(reglages)
  }
  // Le mode « reference » est gardé : des fiches peuvent l'utiliser.
})
