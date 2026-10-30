/// <reference path="../pb_data/types.d.ts" />

// Relance du Département des Hautes-Alpes pour l'autorisation Inforoute
// (demande du propriétaire, 30/10/2026 ; CDC PSV 3.92) : nouvelle demande
// n° 85-5568 du 30/10/2026 (rubrique Routes > Info Route 05), la demande
// initiale 85-5448 du 02/10/2026 étant restée sans réponse. Prochaine
// relance le 30/11/2026. Le code de suivi n'est pas écrit ici : il est dans
// l'e-mail de confirmation du Département.
// Met à jour la tâche « en attente » existante et ajoute la relance à son
// historique ; la crée si elle n'existe plus. Une seule fois.
migrate((app) => {
  const QUOI = "Réponse du Département des Hautes-Alpes : relance n° 85-5568 du 30/10/2026 (rubrique Routes > Info Route 05), après la demande 85-5448 du 02/10/2026 restée sans réponse. Code de suivi : dans l'e-mail de confirmation du Département."
  const REMARQUE = "Relance faite le 30/10/2026 : nouvelle demande n° 85-5568 (Routes > Info Route 05), avec la capture de la première demande jointe."
  const TITRE = "Autorisation Inforoute (demande 85-5448 du 02/10, relance 85-5568 du 30/10)"

  let t = app.findRecordsByFilter("taches", "titre ~ 'Autorisation Inforoute'", "", 5, 0)
    .filter((x) => x.getString("etat") !== "terminee")[0]
  if (t) {
    const deja = app.findRecordsByFilter("historique", "tache = {:t} && remarque ~ '85-5568'", "", 1, 0, { t: t.id })
    if (deja.length) return
  } else {
    let psv
    try {
      psv = app.findFirstRecordByFilter("domaines", "nom = 'Puy-Saint-Vincent'")
    } catch (e) {
      return
    }
    t = new Record(app.findCollectionByNameOrId("taches"))
    t.set("domaine", psv.id)
    t.set("priorite", "confort")
    t.set("mode", "unique")
    t.set("souplesse", "souple")
    t.set("tolerance", 7)
  }
  t.set("titre", TITRE)
  t.set("etat", "attente")
  t.set("attente_quoi", QUOI)
  t.set("attente_relance", "2026-11-30 00:00:00.000Z")
  app.save(t)

  const h = new Record(app.findCollectionByNameOrId("historique"))
  h.set("tache", t.id)
  h.set("type", "relance")
  h.set("date", "2026-10-30 00:00:00.000Z")
  h.set("remarque", REMARQUE)
  h.set("nouvelle_echeance", "2026-11-30 00:00:00.000Z")
  app.save(h)
}, (app) => {
  // Retour en arrière volontairement vide : on ne supprime jamais les
  // données du propriétaire.
})
