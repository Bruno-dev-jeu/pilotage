/// <reference path="../pb_data/types.d.ts" />

// Ménage après le refus d'indexation des sites privés (CDC 0.19, 30/10/2026) :
// la copie de secours du Caddyfile, faite juste avant la modification, est à
// supprimer une fois les sites vérifiés pendant quelques jours (demande du
// propriétaire, 30/10/2026). Tâche ponctuelle, avec sa procédure. Créée une
// seule fois.
// Même migration : correction de l'heure de la sauvegarde du PC dans la
// procédure « Échanger le disque de sauvegarde du PC » (0 h 30 écrit, tâche
// Windows « Sauvegarde nuit » réglée sur 0 h 45), seulement si l'étape n'a
// pas déjà été modifiée dans l'application.
migrate((app) => {
  app.findRecordsByFilter("etapes", "texte ~ {:a}", "", 0, 0, { a: "(elle tourne à 0 h 30)" }).forEach((e) => {
    e.set("texte", e.getString("texte").replace("(elle tourne à 0 h 30)", "(elle tourne à 0 h 45)"))
    app.save(e)
  })

  const TITRE = "Supprimer la copie de secours /etc/caddy/Caddyfile.avant-noindex"
  if (app.findRecordsByFilter("taches", "titre = {:t}", "", 1, 0, { t: TITRE }).length) return
  let domaine
  try {
    domaine = app.findFirstRecordByFilter("domaines", "nom = 'Serveur'")
  } catch (e) {
    return
  }
  const t = new Record(app.findCollectionByNameOrId("taches"))
  const valeurs = {
    titre: TITRE, domaine: domaine.id, priorite: "confort", mode: "unique", intervalle: 0, unite: "",
    dates_fixes: "", echeance: "2026-11-06 00:00:00.000Z", souplesse: "souple", tolerance: 7, rappel_jours: 0,
    etat: "active",
    notes: "Copie du Caddyfile faite le 30/10/2026 avant l'ajout de l'en-tête X-Robots-Tag (refus d'indexation) " +
      "aux blocs psv et immat. Inutile une fois les sites vérifiés : le Caddyfile en service fait foi.",
  }
  Object.keys(valeurs).forEach((k) => t.set(k, valeurs[k]))
  app.save(t)

  const ETAPES = [
    ["Vérifiez d'abord que les sites répondent normalement : psv.bmlab.fr, immat.bmlab.fr et la vitrine hameau-ecrins-405.bmlab.fr s'ouvrent, et « Sites » est vert dans les contrôles du Pilotage. Si un site ne marche plus, ne supprimez rien : la copie sert à revenir en arrière.", ""],
    ["Connectez-vous au serveur depuis PowerShell sur le PC.", "ssh bmlab"],
    ["Supprimez la copie de secours (le mot de passe du serveur est demandé).", "sudo rm /etc/caddy/Caddyfile.avant-noindex"],
    ["Contrôle : la commande doit répondre « Aucun fichier ou dossier de ce type » (ou « No such file or directory »). Puis « Fait » ici.", "ls /etc/caddy/Caddyfile.avant-noindex"],
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
