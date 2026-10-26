/// <reference path="../pb_data/types.d.ts" />

// Échéances du site PSV demandées par le propriétaire le 26/10/2026 (relayées
// par la session d'audit de sécurité PSV ; CDC Pilotage 0.5) :
//  1) nouvelle tâche trimestrielle : vérification proactive des liens de
//     psv.bmlab.fr, surtout les liens externes ;
//  2) vérification semestrielle de TOUS les tarifs du site, à la mi-mai et à
//     la mi-novembre : ce sont les deux tâches « Informations datées » de
//     l'inventaire (déjà au 15/05 et au 15/11), dont le titre est précisé.
//     Le titre n'est changé que s'il est encore celui d'origine (une
//     correction faite par le propriétaire dans l'application est gardée).
// Rien n'est créé deux fois : la tâche des liens n'est ajoutée que si aucune
// tâche du même titre n'existe.
migrate((app) => {
  let psv
  try {
    psv = app.findFirstRecordByFilter("domaines", "nom = 'Puy-Saint-Vincent'")
  } catch (e) {
    return
  }

  const TITRE_LIENS = "Vérifier les liens de psv.bmlab.fr, surtout les liens externes"
  const existe = app.findRecordsByFilter("taches", "titre = {:t}", "", 1, 0, { t: TITRE_LIENS })
  if (!existe.length) {
    const r = new Record(app.findCollectionByNameOrId("taches"))
    const valeurs = {
      domaine: psv.id, titre: TITRE_LIENS, priorite: "important", mode: "fixe", intervalle: 0, unite: "",
      dates_fixes: "15/01, 15/04, 15/07, 15/10", echeance: "2027-01-15 00:00:00.000Z", souplesse: "souple", tolerance: 7,
      etat: "active",
      notes: "Contrôle proactif de tous les liens : liens des fiches tourisme (restaurants, commerces, activités, remontées mécaniques), notices PDF des constructeurs, etc. " +
        "Complète la détection existante (broken_link_reports.pb.js et lang.js : e-mail quand un locataire clique un lien cassé), qui ne voit pas les liens jamais cliqués.",
    }
    Object.keys(valeurs).forEach((k) => r.set(k, valeurs[k]))
    app.save(r)
  }

  const RENOMMER = [
    ["Informations datées de l'hiver (ouvertures, horaires, tarifs des fiches tourisme)",
      "Vérifier tous les tarifs et informations datées du site PSV avant l'hiver"],
    ["Informations datées de l'été",
      "Vérifier tous les tarifs et informations datées du site PSV avant l'été"],
  ]
  RENOMMER.forEach((p) => {
    app.findRecordsByFilter("taches", "titre = {:t}", "", 10, 0, { t: p[0] }).forEach((t) => {
      t.set("titre", p[1])
      if (!t.getString("notes")) {
        t.set("notes", "Tous les prix affichés dans les fiches (activités, commerces, services, remontées mécaniques…), ouvertures et horaires : à revoir et mettre à jour (demande du propriétaire, mi-mai et mi-novembre).")
      }
      app.save(t)
    })
  })
}, (app) => {
  // Retour en arrière volontairement vide : on ne supprime jamais les
  // données du propriétaire.
})
