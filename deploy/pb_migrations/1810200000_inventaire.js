/// <reference path="../pb_data/types.d.ts" />

// Inventaire de départ (CDC chapitre 9, version 0.3 du 23/10/2026) : domaines
// et tâches validés par le propriétaire. Chargé une seule fois, seulement si
// la collection « taches » est vide (rien n'est écrasé ensuite : le
// propriétaire corrige dans l'application).
// Les tâches faites automatiquement chaque nuit (🤖) ne sont pas ici : elles
// viendront avec les contrôles de l'étape 2.
// Aucune donnée sensible : ni immatriculation, ni numéro de document.
migrate((app) => {
  if (app.countRecords("taches") > 0) return

  const domaines = app.findCollectionByNameOrId("domaines")
  const taches = app.findCollectionByNameOrId("taches")
  const ids = {}

  const D = [
    // clé, nom, emoji, parent, ordre
    ["info", "Informatique", "💻", "", 10],
    ["serveur", "Serveur", "🖥️", "info", 10],
    ["tous", "Tous les projets", "🧩", "info", 20],
    ["psv", "Puy-Saint-Vincent", "🏔️", "info", 30],
    ["immat", "Immatriculation", "🔤", "info", 40],
    ["courses", "Courses", "🛒", "info", 50],
    ["pc", "PC et sauvegardes", "💾", "info", 60],
    ["maison", "Maison", "🏠", "", 20],
    ["voitures", "Voitures", "🚙", "", 30],
    ["eos", "VW Eos d'Agnès", "🚗", "voitures", 10],
    ["tiguan", "VW Tiguan de Bruno", "🚙", "voitures", 20],
    ["appart", "Appartement 405", "🏢", "", 40],
    ["admin", "Administratif", "📄", "", 50],
  ]
  D.forEach((d) => {
    const r = new Record(domaines)
    r.set("nom", d[1])
    r.set("emoji", d[2])
    r.set("ordre", d[4])
    if (d[3]) r.set("parent", ids[d[3]])
    app.save(r)
    ids[d[0]] = r.id
  })

  const jour = (s) => (s ? s + " 00:00:00.000Z" : "")

  // Valeurs par défaut d'une tâche, complétées par chaque ligne.
  const T = (domaine, titre, o) => Object.assign({
    domaine: domaine, titre: titre, priorite: "important", mode: "apres", intervalle: 0, unite: "",
    dates_fixes: "", echeance: "", souplesse: "souple", tolerance: 7, rappel_jours: 0,
    preparation: "", preparation_jours: 0, condition: "", etat: "active", attente_quoi: "",
    attente_relance: "", derniere_realisation: "", materiel: "", contacts: "", notes: "",
  }, o)
  const IMP = { souplesse: "imperative", tolerance: 0 }
  const TRIMESTRE = "15/01, 15/04, 15/07, 15/10"

  const L = [
    // 9.1 Informatique
    T("serveur", "Remettre le module Infomaniak dans Caddy, créer un nouveau jeton, remettre les fichiers .avant-secours", {
      mode: "unique", etat: "attente", attente_quoi: "Service de fabrication de caddyserver.com (caddy add-package bloqué le 23/10/2026)",
      attente_relance: "2026-10-26",
      notes: "Le nouveau jeton ira dans un fichier lisible par root seulement (EnvironmentFile), jamais dans le fichier de service. Ancien jeton supprimé le 23/10/2026.",
    }),
    T("serveur", "Mises à jour du système (hors sécurité, hors Caddy)", { mode: "fixe", dates_fixes: "01", echeance: "2026-11-01", tolerance: 5 }),
    T("tous", "Revue de sécurité trimestrielle (méthode du CDC PSV, chapitre 23)", { priorite: "critique", mode: "fixe", dates_fixes: TRIMESTRE, echeance: "2027-01-15" }),
    T("tous", "Montée de version : PocketBase (accueil, immat, courses, sandbox, pilotage), Caddy (caddy upgrade), bibliothèques", {
      priorite: "critique", mode: "fixe", dates_fixes: TRIMESTRE, echeance: "2027-01-15",
      notes: "Jamais par apt upgrade pour Caddy (paquet bloqué) : sudo caddy upgrade seulement, en présence du propriétaire.",
    }),
    T("tous", "Test de restauration d'une sauvegarde (PSV, Courses, Pilotage, à tour de rôle)", { mode: "apres", intervalle: 3, unite: "mois", echeance: "2026-12-15" }),
    T("tous", "Renouvellement des secrets : clé Turnstile, mot de passe du relais e-mail, mots de passe d'administration, jeton Infomaniak", {
      mode: "apres", intervalle: 1, unite: "ans", echeance: "2027-10-23", tolerance: 15,
    }),
    T("tous", "Renouvellement du nom de domaine bmlab.fr", Object.assign({ priorite: "critique", mode: "fixe", dates_fixes: "10/09", echeance: "2027-09-10" }, IMP)),
    T("pc", "Test de restauration de la sauvegarde du PC", { mode: "apres", intervalle: 3, unite: "mois", echeance: "2026-12-15" }),
    T("pc", "Refonte de la sauvegarde du PC (proposition restic de l'audit du 14/10)", {
      mode: "unique", etat: "attente", attente_quoi: "Décision du propriétaire", attente_relance: "2026-11-15",
    }),
    T("immat", "Décider du sort d'Immatriculation côté sauvegarde (aucune sauvegarde serveur ; seuls les réglages du joueur y sont)", {
      priorite: "confort", mode: "unique", echeance: "2026-11-15",
    }),
    T("psv", "Test de charge du site PSV (plan S20)", { priorite: "confort", mode: "unique", echeance: "2026-12-15" }),

    // 9.2 Puy-Saint-Vincent
    T("psv", "Ménage RGPD dans Gmail (messages des locataires au-delà des durées de la politique)", {
      mode: "fixe", dates_fixes: TRIMESTRE, echeance: "2027-01-15",
      notes: "Recherche subject:\"[Site PSV]\" older_than:1y, puis vider la corbeille (CDC PSV v2.229).",
    }),
    T("psv", "Relecture de la politique de confidentialité et du registre RGPD", { mode: "fixe", dates_fixes: "08/10", echeance: "2027-10-08", tolerance: 15 }),
    T("psv", "Validation des textes RGPD par le juriste", { mode: "unique", etat: "attente", attente_quoi: "Réponse du juriste", attente_relance: "2026-11-15" }),
    T("psv", "Autorisation Inforoute (demande 85-5448 du 02/10)", {
      priorite: "confort", mode: "unique", etat: "attente", attente_quoi: "Réponse du Département, demande 85-5448", attente_relance: "2026-11-02",
    }),
    T("psv", "Tarif de la taxe de séjour de l'année", { mode: "fixe", dates_fixes: "15/01", echeance: "2027-01-15" }),
    T("psv", "Informations datées de l'hiver (ouvertures, horaires, tarifs des fiches tourisme)", { mode: "fixe", dates_fixes: "15/11", echeance: "2026-11-15" }),
    T("psv", "Informations datées de l'été", { mode: "fixe", dates_fixes: "15/05", echeance: "2027-05-15" }),
    T("courses", "Étape 5 de Courses (abandon du classeur Excel)", {
      priorite: "confort", mode: "unique", etat: "attente", attente_quoi: "Fin de la reprise du classeur", attente_relance: "2026-12-15",
    }),

    // 9.3 Maison
    T("maison", "Nettoyer l'adoucisseur d'eau", { mode: "apres", intervalle: 6, unite: "mois", echeance: "2027-04-03", derniere_realisation: "2026-10-03", tolerance: 15 }),
    T("maison", "Graisser les lames de la pergola bioclimatique", {
      mode: "fixe", dates_fixes: "01/11", echeance: "2026-11-15", tolerance: 15,
      notes: "Pergola neuve, jamais graissée : premier graissage vers la mi-novembre 2026, puis chaque fin octobre ou début novembre.",
    }),
    T("maison", "Ramonage de la cheminée", {
      priorite: "critique", mode: "fixe", dates_fixes: "15/09", echeance: "2026-11-15", tolerance: 15,
      preparation: "Réserver le ramoneur", preparation_jours: 30,
      notes: "Avant le premier feu. Garder le certificat de ramonage (demandé par l'assurance) : l'ajouter en justificatif au moment de « Fait ».",
    }),
    T("maison", "Vérifier et recharger le sel de l'adoucisseur", { priorite: "confort", mode: "apres", intervalle: 3, unite: "mois", echeance: "2027-01-03", tolerance: 15 }),
    T("maison", "Entretien de la pompe à chaleur (obligatoire tous les 2 ans)", Object.assign({
      priorite: "critique", mode: "apres", intervalle: 2, unite: "ans",
      preparation: "Prendre rendez-vous avec le chauffagiste", preparation_jours: 30,
      notes: "Date du dernier entretien : sur la dernière attestation du chauffagiste. Garder l'attestation en justificatif.",
    }, IMP)),
    T("maison", "Tester les détecteurs de fumée, changer les piles", { mode: "apres", intervalle: 6, unite: "mois", echeance: "2026-12-01", tolerance: 15 }),
    T("maison", "Nettoyer les bouches et filtres de la VMC", { priorite: "confort", mode: "apres", intervalle: 6, unite: "mois", echeance: "2026-12-01", tolerance: 15 }),
    T("maison", "Nettoyer les gouttières (après la chute des feuilles)", { priorite: "confort", mode: "fixe", dates_fixes: "30/11", echeance: "2026-11-30", tolerance: 15 }),
    T("maison", "Apporter le robot tondeuse à l'entretien (après la dernière tonte)", { priorite: "confort", mode: "fixe", dates_fixes: "15/11", echeance: "2026-11-15", tolerance: 15 }),
    T("maison", "Passage du paysagiste", {
      mode: "fixe", dates_fixes: "15/11", echeance: "2026-11-15", tolerance: 15,
      preparation: "Appeler le paysagiste pour fixer la date", preparation_jours: 60,
    }),
    T("maison", "Hiverner la piscine", {
      mode: "fixe", dates_fixes: "15/11", echeance: "2026-11-15", tolerance: 15,
      condition: "Quand l'eau est autour de 12 °C, avant les premières gelées.",
    }),

    // 9.4 Voitures
    T("eos", "Contrôle technique", Object.assign({
      priorite: "critique", mode: "apres", intervalle: 2, unite: "ans", echeance: "2027-05-15", derniere_realisation: "2025-05-15",
      preparation: "Prendre rendez-vous au contrôle technique", preparation_jours: 30,
      notes: "Dernier contrôle noté au 15/05/2025 : date exacte à vérifier sur le procès-verbal.",
    }, IMP)),
    T("eos", "Mettre les chaînes dans le coffre (loi Montagne)", Object.assign({ priorite: "critique", mode: "fixe", dates_fixes: "01/11", echeance: "2026-11-01" }, IMP)),
    T("eos", "Retirer les chaînes du coffre (fin de l'obligation le 31 mars)", { priorite: "confort", mode: "fixe", dates_fixes: "15/04", echeance: "2027-04-15", tolerance: 15 }),
    T("eos", "Entretien constructeur (vidange…)", { mode: "apres", intervalle: 1, unite: "ans", tolerance: 30, notes: "Selon le carnet d'entretien (kilométrage ou date)." }),
    T("eos", "Échéance de l'assurance", Object.assign({ mode: "apres", intervalle: 1, unite: "ans" }, IMP)),
    T("tiguan", "Premier contrôle technique, puis tous les 2 ans", Object.assign({
      priorite: "critique", mode: "apres", intervalle: 2, unite: "ans", echeance: "2027-12-01",
      preparation: "Prendre rendez-vous au contrôle technique", preparation_jours: 30,
      notes: "Voiture achetée en décembre 2023 : premier contrôle 4 ans après la première mise en circulation (case B de la carte grise). Jour exact à corriger.",
    }, IMP)),
    T("tiguan", "Poser les roues hiver (loi Montagne)", Object.assign({
      priorite: "critique", mode: "fixe", dates_fixes: "01/11", echeance: "2026-11-01",
      preparation: "Prendre rendez-vous au garage", preparation_jours: 21,
    }, IMP)),
    T("tiguan", "Reposer les roues été (fin de l'obligation le 31 mars)", { priorite: "confort", mode: "fixe", dates_fixes: "15/04", echeance: "2027-04-15", tolerance: 15 }),
    T("tiguan", "Entretien constructeur (vidange…)", { mode: "apres", intervalle: 1, unite: "ans", tolerance: 30, notes: "Selon le carnet d'entretien (kilométrage ou date)." }),
    T("tiguan", "Échéance de l'assurance", Object.assign({ mode: "apres", intervalle: 1, unite: "ans" }, IMP)),

    // 9.5 Appartement 405 et administratif
    T("appart", "Assurance propriétaire non occupant", Object.assign({ mode: "apres", intervalle: 1, unite: "ans" }, IMP)),
    T("appart", "Assemblée générale de la copropriété (convocation, vote, procès-verbal)", { priorite: "confort", mode: "apres", intervalle: 1, unite: "ans", tolerance: 30 }),
    T("appart", "Contrat avec l'agence (échéance, renouvellement)", Object.assign({ mode: "apres", intervalle: 1, unite: "ans" }, IMP)),
    T("admin", "Déclaration des revenus locatifs", Object.assign({ priorite: "critique", mode: "apres", intervalle: 1, unite: "ans" }, IMP)),
    T("admin", "Assurance habitation de la maison", Object.assign({ mode: "apres", intervalle: 1, unite: "ans" }, IMP)),
    T("admin", "Papiers d'identité : créer une tâche par document (carte, passeport, permis) avec sa date de fin", {
      mode: "unique", rappel_jours: 90,
      notes: "Une tâche par document, impérative, à la date de fin, avec un premier rappel 90 jours avant. Jamais le numéro du document.",
    }),
    T("admin", "Abonnements : Free, Shadow Drive, Infomaniak, autres (renouvellement, prix)", { priorite: "confort", mode: "apres", intervalle: 1, unite: "ans", tolerance: 15 }),
  ]

  L.forEach((o) => {
    const r = new Record(taches)
    Object.keys(o).forEach((k) => {
      let v = o[k]
      if (k === "domaine") v = ids[v]
      else if (["echeance", "attente_relance", "derniere_realisation"].indexOf(k) >= 0) v = jour(v)
      r.set(k, v)
    })
    app.save(r)
  })
}, (app) => {
  // Retour en arrière volontairement vide : on ne supprime jamais les
  // données du propriétaire.
})
