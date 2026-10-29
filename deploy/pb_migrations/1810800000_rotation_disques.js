/// <reference path="../pb_data/types.d.ts" />

// Rotation mensuelle des disques de sauvegarde du PC (demande du
// propriétaire, 29/10/2026 ; rotation en place depuis le 28/10/2026, voir
// C:\Sauvegarde\Documentation\Strategie-sauvegarde-restauration.pdf, § 8).
// Tâche du dernier jour de chaque mois (« 31 » = dernier jour du mois), avec
// sa préparation (rapporter le disque de l'autre lieu) et sa procédure.
// Créée une seule fois.
migrate((app) => {
  const TITRE = "Échanger le disque de sauvegarde du PC (mois pairs / mois impairs)"
  if (app.findRecordsByFilter("taches", "titre = {:t}", "", 1, 0, { t: TITRE }).length) return
  let domaine
  try {
    domaine = app.findFirstRecordByFilter("domaines", "nom = 'PC et sauvegardes'")
  } catch (e) {
    return
  }
  const t = new Record(app.findCollectionByNameOrId("taches"))
  const valeurs = {
    titre: TITRE, domaine: domaine.id, priorite: "important", mode: "fixe", intervalle: 0, unite: "",
    dates_fixes: "31", echeance: "2026-10-31 00:00:00.000Z", souplesse: "souple", tolerance: 1, rappel_jours: 2,
    preparation: "Rapporter de l'autre lieu le disque du mois qui commence", preparation_jours: 3,
    etat: "active",
    notes: "SAV_PC_MOIS_IMPAIRS (Seagate) : janvier, mars, mai, juillet, septembre, novembre.\n" +
      "SAV_PC_MOIS_PAIRS (Sabrent SSD) : février, avril, juin, août, octobre, décembre.\n" +
      "Tous deux en lettre D : jamais branchés ensemble. Un disque à la maison, l'autre dans un autre lieu.",
  }
  Object.keys(valeurs).forEach((k) => t.set(k, valeurs[k]))
  app.save(t)

  const ETAPES = [
    ["Le dernier jour du mois, on branche le disque du mois qui commence : SAV_PC_MOIS_IMPAIRS (Seagate) pour janvier, mars, mai, juillet, septembre, novembre ; SAV_PC_MOIS_PAIRS (Sabrent SSD) pour février, avril, juin, août, octobre, décembre. Ce jour-là, l'e-mail de sauvegarde du PC affiche un bandeau jaune.", ""],
    ["Faites l'échange en journée, après la sauvegarde de la nuit (elle tourne à 0 h 30). Débranchez proprement le disque actuel : icône « Retirer le périphérique en toute sécurité » dans la barre des tâches, puis attendez le message de Windows.", ""],
    ["Seulement si Windows dit que le disque est « utilisé » : clic droit sur Démarrer › Terminal (administrateur), puis tapez cette commande, et débranchez ensuite.", "Stop-Service VeeamEndpointBackupSvc; fsutil volume dismount D:"],
    ["Branchez l'autre disque au même endroit (PC ou dock). Dans l'Explorateur, vérifiez qu'il apparaît en D: avec le bon nom (SAV_PC_MOIS_PAIRS ou SAV_PC_MOIS_IMPAIRS).", ""],
    ["Seulement si vous avez arrêté Veeam à l'étape 3 : relancez-le, dans le même Terminal administrateur.", "Start-Service VeeamEndpointBackupSvc"],
    ["Emportez le disque débranché dans l'autre lieu : les deux disques ne doivent jamais être au même endroit (c'est ce qui protège d'un vol, d'un incendie ou d'un dégât des eaux).", ""],
    ["Le lendemain matin : l'e-mail de sauvegarde du PC ne doit pas être en ALERTE (il l'est si le disque du mois précédent est resté branché), et « Sauvegarde du PC » doit être verte dans les contrôles du Pilotage. Puis « Fait » ici, avec en remarque le disque branché.", ""],
  ]
  const etapes = app.findCollectionByNameOrId("etapes")
  ETAPES.forEach((x, i) => {
    const r = new Record(etapes)
    r.set("tache", t.id)
    r.set("ordre", (i + 1) * 10)
    r.set("texte", x[0])
    r.set("commande", x[1])
    app.save(r)
  })
}, (app) => {
  // Retour en arrière volontairement vide : on ne supprime jamais les
  // données du propriétaire.
})
