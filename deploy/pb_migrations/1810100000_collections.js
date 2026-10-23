/// <reference path="../pb_data/types.d.ts" />

// Collections de l'étape 1 du Pilotage (CDC chapitres 3, 4 et 6, 23/10/2026) :
// domaines, taches, etapes (procédures pas à pas), historique (réalisations,
// reports, attentes, avec justificatifs), reglages (destinataire des
// e-mails) et envois (journal des e-mails du matin).
// Lecture et écriture pour le compte du propriétaire (collection users)
// uniquement ; rien sans connexion. Fichiers protégés (jeton requis).
// Champs ajoutés avec fields.add() : passés au constructeur, PocketBase 0.40
// les ignore. Ne crée que les collections absentes.
const FOYER = '@request.auth.collectionName = "users"'

function creer(app, nom, regles, champs, index) {
  try {
    return app.findCollectionByNameOrId(nom)
  } catch (e) {
    // absente : on la crée
  }
  const collection = new Collection(Object.assign({ type: "base", name: nom }, regles))
  champs.forEach((champ) => collection.fields.add(champ))
  collection.fields.add(new AutodateField({ name: "created", onCreate: true, onUpdate: false }))
  collection.fields.add(new AutodateField({ name: "updated", onCreate: true, onUpdate: true }))
  collection.indexes = index || []
  app.save(collection)
  return collection
}

const TOUT = { listRule: FOYER, viewRule: FOYER, createRule: FOYER, updateRule: FOYER, deleteRule: FOYER }

migrate((app) => {
  const domaines = creer(app, "domaines", TOUT, [
    new TextField({
      name: "nom", required: true, max: 80,
      help: "Nom du domaine tel qu'il s'affiche. Ex. Maison, Voitures, VW Eos d'Agnès, Serveur.",
    }),
    new TextField({
      name: "emoji", required: false, max: 16,
      help: "Petit pictogramme affiché devant le nom. Ex. 🏠 pour Maison, 🚙 pour Voitures. Vide : aucun.",
    }),
    new NumberField({
      name: "ordre", required: false, onlyInt: true,
      help: "Rang d'affichage parmi les domaines de même niveau, du plus petit au plus grand. Ex. 10, 20, 30.",
    }),
  ])
  // Domaine parent : ajouté après la création (relation vers la collection elle-même).
  if (!domaines.fields.getByName("parent")) {
    domaines.fields.add(new RelationField({
      name: "parent", required: false, maxSelect: 1, cascadeDelete: false, collectionId: domaines.id,
      help: "Domaine qui contient celui-ci, pour un sous-domaine. Ex. Voitures pour VW Eos d'Agnès, Informatique pour Serveur. Vide : domaine principal.",
    }))
    app.save(domaines)
  }

  const taches = creer(app, "taches", TOUT, [
    new TextField({
      name: "titre", required: true, max: 200,
      help: "Ce qu'il faut faire, en quelques mots. Ex. Nettoyer l'adoucisseur d'eau, Contrôle technique.",
    }),
    new RelationField({
      name: "domaine", required: true, maxSelect: 1, cascadeDelete: false, collectionId: domaines.id,
      help: "Domaine de la tâche (ou sous-domaine). Ex. Maison, VW Tiguan de Bruno, Serveur.",
    }),
    new SelectField({
      name: "priorite", required: true, maxSelect: 1, values: ["critique", "important", "confort"],
      help: "critique : sécurité, panne, obligation légale (rappel chaque jour en retard) ; important : entretien, sauvegardes (tous les 3 jours) ; confort : le reste (résumé du lundi seulement).",
    }),
    new SelectField({
      name: "mode", required: true, maxSelect: 1, values: ["apres", "fixe", "unique"],
      help: "apres : intervalle compté depuis la dernière réalisation (adoucisseur tous les 6 mois) ; fixe : dates du calendrier (revue en janvier, avril…) ; unique : une seule fois.",
    }),
    new NumberField({
      name: "intervalle", required: false, min: 0, onlyInt: true,
      help: "Pour le mode apres : nombre d'unités entre deux réalisations. Ex. 6 (avec l'unité mois) pour l'adoucisseur, 2 (ans) pour le contrôle technique.",
    }),
    new SelectField({
      name: "unite", required: false, maxSelect: 1, values: ["jours", "semaines", "mois", "ans"],
      help: "Unité de l'intervalle du mode apres. Ex. mois.",
    }),
    new TextField({
      name: "dates_fixes", required: false, max: 200,
      help: "Pour le mode fixe : dates JJ/MM chaque année, séparées par des virgules, ou JJ seul pour chaque mois. Ex. 15/01, 15/04, 15/07, 15/10 ; 01/11 ; 01 (le 1er de chaque mois).",
    }),
    new DateField({
      name: "echeance", required: false,
      help: "Prochaine date visée (tâche souple) ou date limite (tâche impérative). Vide : date inconnue, la tâche est rangée dans « À compléter ». Ex. 15/11/2026.",
    }),
    new DateField({
      name: "date_limite", required: false,
      help: "Tâche impérative reportée : date limite d'origine, toujours affichée en rouge pour qu'un report ne cache jamais une obligation. Rempli tout seul au report, vidé à la réalisation.",
    }),
    new SelectField({
      name: "souplesse", required: true, maxSelect: 1, values: ["imperative", "souple"],
      help: "imperative : en retard dès le lendemain de la date (contrôle technique, assurance) ; souple : à quelques jours près, voir la tolérance (pergola, adoucisseur).",
    }),
    new NumberField({
      name: "tolerance", required: false, min: 0, max: 365, onlyInt: true,
      help: "Tâche souple : nombre de jours avant et après la date visée. La tâche apparaît à date − tolérance et n'est en retard qu'après date + tolérance. Ex. 15.",
    }),
    new NumberField({
      name: "rappel_jours", required: false, min: 0, max: 365, onlyInt: true,
      help: "Premier rappel par e-mail, en jours avant la date. Vide ou 0 : 30 jours pour une tâche annuelle ou plus, 7 jours sinon. Ex. 90 pour une carte d'identité.",
    }),
    new TextField({
      name: "preparation", required: false, max: 300,
      help: "Ce qu'il faut faire à l'avance, s'il y a lieu. Ex. Appeler le paysagiste pour fixer la date ; Prendre rendez-vous au contrôle technique.",
    }),
    new NumberField({
      name: "preparation_jours", required: false, min: 0, max: 365, onlyInt: true,
      help: "Nombre de jours avant la date où la préparation apparaît comme tâche à part. Ex. 60 pour le paysagiste, 30 pour un rendez-vous.",
    }),
    new BoolField({
      name: "preparation_faite", required: false,
      help: "Coché quand la préparation de l'échéance en cours est faite. Décoché tout seul à la réalisation de la tâche.",
    }),
    new TextField({
      name: "condition", required: false, max: 300,
      help: "Condition à observer, affichée en tête de la fiche et dans l'e-mail. Ex. Quand l'eau est autour de 12 °C, avant les premières gelées.",
    }),
    new SelectField({
      name: "etat", required: true, maxSelect: 1, values: ["active", "attente", "terminee"],
      help: "active : tâche suivie ; attente : on attend quelqu'un ou quelque chose (voir attente_quoi et la date de relance) ; terminee : tâche unique faite.",
    }),
    new TextField({
      name: "attente_quoi", required: false, max: 300,
      help: "Tâche en attente : ce qu'on attend et de qui. Ex. Réponse du Département, demande 85-5448.",
    }),
    new DateField({
      name: "attente_relance", required: false,
      help: "Tâche en attente : date où relancer ou décider. Ex. 02/11/2026.",
    }),
    new DateField({
      name: "derniere_realisation", required: false,
      help: "Date de la dernière réalisation, mise à jour par le bouton « Fait ». Ex. 03/10/2026.",
    }),
    new DateField({
      name: "rappel_envoye", required: false,
      help: "Usage interne : échéance pour laquelle le premier rappel par e-mail est déjà parti, pour ne pas le répéter. Vidé à chaque nouvelle échéance.",
    }),
    new TextField({
      name: "materiel", required: false, max: 2000,
      help: "Matériel ou produits nécessaires, un par ligne, avec un lien d'achat si utile. Ex. Sel régénérant, 2 sacs de 25 kg.",
    }),
    new TextField({
      name: "contacts", required: false, max: 2000,
      help: "Contacts utiles (artisan, garage), texte libre. Ex. Garage du centre, 04 76 00 00 00. Jamais de mot de passe ni de code.",
    }),
    new TextField({
      name: "notes", required: false, max: 5000,
      help: "Remarques libres sur la tâche. Ex. Date exacte du dernier contrôle à vérifier sur le procès-verbal. Jamais de mot de passe ni de code : dire seulement où le trouver.",
    }),
  ], [
    "CREATE INDEX idx_taches_domaine ON taches (domaine)",
    "CREATE INDEX idx_taches_etat ON taches (etat)",
  ])

  creer(app, "etapes", TOUT, [
    new RelationField({
      name: "tache", required: true, maxSelect: 1, cascadeDelete: true, collectionId: taches.id,
      help: "Tâche dont cette étape fait partie. Supprimer la tâche supprime ses étapes.",
    }),
    new NumberField({
      name: "ordre", required: false, onlyInt: true,
      help: "Rang de l'étape dans la procédure, du plus petit au plus grand. Ex. 10, 20, 30.",
    }),
    new TextField({
      name: "texte", required: false, max: 5000,
      help: "Ce qu'il faut faire à cette étape, en clair. Ex. Couper l'arrivée d'eau avec la vanne bleue sous l'évier.",
    }),
    new TextField({
      name: "commande", required: false, max: 3000,
      help: "Commande à copier, s'il y en a une (informatique). Ex. sudo systemctl status caddy. Jamais de mot de passe ni de jeton.",
    }),
    new FileField({
      name: "photos", required: false, maxSelect: 20, maxSize: 5242880, protected: true, thumbs: ["400x0"],
      mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
      help: "Photos de l'étape, réduites par l'application à environ 300 Ko chacune. 20 au plus.",
    }),
    new FileField({
      name: "video", required: false, maxSelect: 1, maxSize: 262144000, protected: true,
      mimeTypes: ["video/mp4", "video/quicktime", "video/webm", "video/x-m4v"],
      help: "Vidéo courte filmée au téléphone (2 minutes environ, 250 Mo au plus). Plus longue : utiliser le lien.",
    }),
    new URLField({
      name: "lien", required: false,
      help: "Lien vers une vidéo ou une page externe. Ex. vidéo YouTube non répertoriée, dossier Google Drive, notice du fabricant.",
    }),
  ], ["CREATE INDEX idx_etapes_tache ON etapes (tache)"])

  creer(app, "historique", TOUT, [
    new RelationField({
      name: "tache", required: true, maxSelect: 1, cascadeDelete: true, collectionId: taches.id,
      help: "Tâche concernée. Supprimer la tâche supprime son historique.",
    }),
    new SelectField({
      name: "type", required: true, maxSelect: 1, values: ["fait", "report", "attente", "relance", "fin_attente", "preparation", "note"],
      help: "fait : réalisation ; report : nouvelle date (raison obligatoire) ; attente, relance, fin_attente : suivi d'une attente ; preparation : préparation faite ; note : simple remarque.",
    }),
    new DateField({
      name: "date", required: true,
      help: "Date de l'événement (réalisation, report…). Ex. 03/10/2026.",
    }),
    new TextField({
      name: "remarque", required: false, max: 3000,
      help: "Remarque libre ; raison du report (obligatoire) ; ce qu'on attend. Ex. Garage complet, rendez-vous le 05/11.",
    }),
    new NumberField({
      name: "duree", required: false, min: 0, onlyInt: true,
      help: "Durée de la réalisation, en minutes, si on veut la noter. Ex. 45.",
    }),
    new NumberField({
      name: "cout", required: false, min: 0,
      help: "Coût en euros, si on veut le noter. Ex. 75,50.",
    }),
    new FileField({
      name: "justificatifs", required: false, maxSelect: 10, maxSize: 20971520, protected: true,
      mimeTypes: ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic"],
      help: "Justificatifs : certificat de ramonage, procès-verbal du contrôle technique, facture (PDF ou photo, 20 Mo au plus chacun, 10 au plus).",
    }),
    new DateField({
      name: "ancienne_echeance", required: false,
      help: "Échéance de la tâche avant cet événement (rempli tout seul). Ex. 15/11/2026.",
    }),
    new DateField({
      name: "nouvelle_echeance", required: false,
      help: "Report : nouvelle date choisie ; attente ou relance : date de relance ; fait : prochaine échéance calculée (remplie toute seule).",
    }),
  ], [
    "CREATE INDEX idx_historique_tache ON historique (tache)",
    "CREATE INDEX idx_historique_date ON historique (date)",
  ])

  creer(app, "reglages", { listRule: FOYER, viewRule: FOYER, createRule: FOYER, updateRule: FOYER, deleteRule: null }, [
    new EmailField({
      name: "email_rappels", required: false,
      help: "Adresse qui reçoit l'e-mail du matin et le résumé du lundi : la même que celle du rapport de sauvegarde du PC. Jamais écrite dans le dépôt.",
    }),
    new URLField({
      name: "adresse_site", required: false,
      help: "Adresse de l'application, pour les boutons des e-mails. Ex. https://pilotage.bmlab.fr",
    }),
  ])

  creer(app, "envois", { listRule: FOYER, viewRule: FOYER, createRule: null, updateRule: null, deleteRule: null }, [
    new TextField({
      name: "jour", required: true, max: 10,
      help: "Jour de l'envoi à Paris, au format AAAA-MM-JJ. Ex. 2026-10-26.",
    }),
    new SelectField({
      name: "type", required: true, maxSelect: 1, values: ["quotidien", "lundi", "essai", "rien"],
      help: "quotidien : e-mail du matin ; lundi : résumé de la semaine ; essai : envoyé depuis les réglages ; rien : aucun e-mail ce matin, rien à signaler.",
    }),
    new SelectField({
      name: "statut", required: true, maxSelect: 1, values: ["ok", "echec"],
      help: "ok : envoyé (ou rien à envoyer) ; echec : envoi impossible, voir le détail.",
    }),
    new TextField({
      name: "objet", required: false, max: 300,
      help: "Objet de l'e-mail. Ex. 🔴 1 en retard · 🟠 2 cette semaine.",
    }),
    new TextField({
      name: "detail", required: false, max: 2000,
      help: "Compte rendu en clair : nombre de tâches citées, ou cause de l'échec. Ex. Aucun destinataire réglé.",
    }),
  ], ["CREATE INDEX idx_envois_jour ON envois (jour)"])
}, (app) => {
  ;["envois", "reglages", "historique", "etapes", "taches", "domaines"].forEach((nom) => {
    try {
      app.delete(app.findCollectionByNameOrId(nom))
    } catch (e) {
      // déjà absente
    }
  })
})
