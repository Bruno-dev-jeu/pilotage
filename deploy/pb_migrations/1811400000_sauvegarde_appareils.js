/// <reference path="../pb_data/types.d.ts" />

// Sauvegarde trimestrielle des iPhone et iPad sur le disque de la Freebox
// (demande du propriétaire, 30/10/2026, CDC 0.24). État relevé le 30/10/2026,
// en lecture seule : une sauvegarde par appareil dans Z:\Backup_iPad_iPhone_A_B
// (iPhone de Bruno 317 Go et iPad de Bruno 121 Go du 03/08/2026, iPhone
// d'Agnès 33 Go et iPad d'Agnès 22 Go du 05/07/2026), toutes NON chiffrées ;
// lien symbolique C:\Users\bmiof\Apple\MobileSync\Backup → Z:\Backup_iPad_iPhone_A_B
// en place ; application « Appareils Apple » installée. Les photos ne sont pas
// dans iCloud. Créée une seule fois.
migrate((app) => {
  const TITRE = "Sauvegarder les iPhone et iPad sur la Freebox (Bruno et Agnès)"
  if (app.findRecordsByFilter("taches", "titre = {:t}", "", 1, 0, { t: TITRE }).length) return
  let d
  try {
    d = app.findFirstRecordByFilter("domaines", "nom = 'PC et sauvegardes'")
  } catch (e) {
    return
  }
  const t = new Record(app.findCollectionByNameOrId("taches"))
  const valeurs = {
    titre: TITRE, domaine: d.id, priorite: "important", mode: "fixe", dates_fixes: "15/01, 15/04, 15/07, 15/10",
    echeance: "2026-11-15 00:00:00.000Z", souplesse: "souple", tolerance: 15, etat: "active",
    notes: "Dernières sauvegardes relevées le 30/10/2026 : iPhone de Bruno (317 Go) et iPad de Bruno (121 Go) le 03/08/2026 ; iPhone d'Agnès (33 Go) et iPad d'Agnès (22 Go) le 05/07/2026. Aucune n'est chiffrée.\n" +
      "Première échéance avancée au 15/11/2026, car elles ont plus de trois mois.\n" +
      "Les photos ne sont pas dans iCloud : la sauvegarde d'un appareil contient les photos présentes sur l'appareil ; l'archive complète est dans Z:\\Sav Photos iPhone Bruno et Z:\\Sav Photos iPad Bruno.",
  }
  Object.keys(valeurs).forEach((k) => t.set(k, valeurs[k]))
  app.save(t)

  const ETAPES = [
    ["Quand et quoi : tous les trois mois, les quatre appareils (iPhone et iPad de Bruno, iPhone et iPad d'Agnès), un par un. La sauvegarde se fait avec l'application « Appareils Apple » du PC et part directement sur le disque de la Freebox (Z:\\Backup_iPad_iPhone_A_B), grâce à un raccourci (lien symbolique) déjà en place. Chaque nouvelle sauvegarde remplace la précédente du même appareil. Comptez de quelques minutes à plus d'une heure par appareil.", ""],
    ["Avant de commencer : PC branché sur secteur, et disque de la Freebox visible (Explorateur › Ce PC › lecteur Z:). Vérifiez dans PowerShell que le raccourci vers la Freebox est toujours là : la ligne doit afficher « SymbolicLink » et « Z:\\Backup_iPad_iPhone_A_B ». Sinon, ne sauvegardez pas (la sauvegarde remplirait le disque du PC) et voyez l'étape 10.", "Get-Item \"$env:USERPROFILE\\Apple\\MobileSync\\Backup\" | Select-Object LinkType, Target"],
    ["Vérifiez la place libre sur Z: : il faut au moins 50 Go de marge (la tâche « Vérifier la place libre du disque de la Freebox » donne les seuils).", "Get-PSDrive Z | Select-Object @{n='Libre Go';e={[math]::Round($_.Free/1GB)}}"],
    ["Branchez le premier appareil au PC avec son câble USB et déverrouillez-le. S'il demande « Faire confiance à cet ordinateur ? », touchez « Se fier » et tapez le code de l'appareil.", ""],
    ["Sur le PC, ouvrez l'application « Appareils Apple » (menu Démarrer). Cliquez sur l'appareil dans la colonne de gauche, puis sur l'onglet « Général ».", ""],
    ["Dans la partie « Sauvegardes » : cochez « Sauvegarder toutes les données de votre iPhone (ou iPad) sur ce PC ». Recommandé : cochez aussi « Chiffrer la sauvegarde locale » et choisissez un mot de passe, rangé dans le gestionnaire de mots de passe (sans lui, la sauvegarde ne pourra jamais être restaurée). Une sauvegarde chiffrée garde aussi les mots de passe, la santé et le Wi-Fi, et protège vos messages et photos si le disque de la Freebox est volé. La première sauvegarde chiffrée repart de zéro : elle est plus longue.", ""],
    ["Cliquez sur « Sauvegarder maintenant ». Laissez l'appareil branché et déverrouillé jusqu'à la fin ; n'utilisez pas le disque Z: pendant ce temps.", ""],
    ["Vérifiez : dans « Appareils Apple », « Dernière sauvegarde sur ce PC » doit indiquer aujourd'hui. Vous pouvez aussi lister les dates des sauvegardes sur la Freebox (un dossier par appareil).", "Get-ChildItem 'Z:\\Backup_iPad_iPhone_A_B' -Directory | Select-Object Name, LastWriteTime"],
    ["Débranchez l'appareil, puis recommencez les étapes 4 à 8 pour chacun des trois autres. Pour les appareils d'Agnès, il faut leur code de déverrouillage.", ""],
    ["Seulement si l'étape 2 a montré que le raccourci manque : suivez le fichier « Procédure pour création lien symbolique.txt » (dans Z:\\Backup_iPad_iPhone_A_B). Dans une invite de commandes en administrateur, après avoir renommé un éventuel dossier Backup existant en Backup_Old :", "mklink /D \"C:\\Users\\bmiof\\Apple\\MobileSync\\Backup\" \"Z:\\Backup_iPad_iPhone_A_B\""],
    ["Touchez « Fait » ici, avec en remarque les appareils sauvegardés, et s'ils sont chiffrés.", ""],
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
