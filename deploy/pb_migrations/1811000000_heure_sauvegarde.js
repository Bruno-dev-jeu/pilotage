/// <reference path="../pb_data/types.d.ts" />

// Correction de l'heure de la sauvegarde du PC dans la procédure « Échanger
// le disque de sauvegarde du PC » (CDC 0.20, 30/10/2026) : 0 h 30 écrit, tâche
// Windows « Sauvegarde nuit » réglée sur 0 h 45. Seulement si l'étape n'a pas
// déjà été modifiée dans l'application. Fichier à part : la migration
// 1810900000 avait déjà tourné sur le serveur avant d'être complétée.
migrate((app) => {
  app.findRecordsByFilter("etapes", "texte ~ {:a}", "", 0, 0, { a: "(elle tourne à 0 h 30)" }).forEach((e) => {
    e.set("texte", e.getString("texte").replace("(elle tourne à 0 h 30)", "(elle tourne à 0 h 45)"))
    app.save(e)
  })
}, (app) => {
  // Retour en arrière volontairement vide : on ne touche plus aux données du
  // propriétaire.
})
