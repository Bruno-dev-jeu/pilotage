/// <reference path="../pb_data/types.d.ts" />

// Place libre du disque de la Freebox (demande du propriétaire, 30/10/2026,
// CDC 0.23). Le serveur est une machine virtuelle dont le disque est un
// fichier qui grossit (Z:\VMs\sommeil-server.qcow2, 5,4 Go le 30/10/2026) sur
// le disque 01 de la Freebox (917 Go, 167 Go libres), rempli surtout par les
// sauvegardes des iPhone et iPad. Si ce disque se remplit, le serveur ne peut
// plus écrire : tous les sites s'arrêtent. Le serveur ne voit pas ce disque ;
// la vérification automatique se fait chaque nuit depuis le PC (script de
// sauvegarde, lecteur Z:), et cette tâche mensuelle en garde la trace.
// Créée une seule fois.
migrate((app) => {
  const TITRE = "Vérifier la place libre du disque de la Freebox"
  if (app.findRecordsByFilter("taches", "titre = {:t}", "", 1, 0, { t: TITRE }).length) return
  let d
  try {
    d = app.findFirstRecordByFilter("domaines", "nom = 'Serveur'")
  } catch (e) {
    return
  }
  const t = new Record(app.findCollectionByNameOrId("taches"))
  const valeurs = {
    titre: TITRE, domaine: d.id, priorite: "important", mode: "fixe", dates_fixes: "15",
    echeance: "2026-11-15 00:00:00.000Z", souplesse: "souple", tolerance: 5, etat: "active",
    notes: "Relevé du 30/10/2026 : disque 01 de 917 Go, 750 Go utilisés, 167 Go libres. Sauvegardes des iPhone et iPad 494 Go, copies des photos 241 Go, serveur (VMs) 5,4 Go. Seuils : 🟠 sous 100 Go libres, 🔴 sous 50 Go.",
  }
  Object.keys(valeurs).forEach((k) => t.set(k, valeurs[k]))
  app.save(t)

  const ETAPES = [
    ["Pourquoi : le serveur de tous les sites est un fichier posé sur ce disque (Z:\\VMs\\sommeil-server.qcow2) qui grossit au fil du temps. Si le disque de la Freebox se remplit, le serveur ne peut plus écrire et tous les sites s'arrêtent. Le serveur ne voit pas ce disque ; le PC le vérifie chaque nuit, et ce contrôle mensuel en garde la trace.", ""],
    ["Regardez la place libre : sur le PC, Explorateur › Ce PC › lecteur Z: (disque de la Freebox), ou dans PowerShell avec la commande ci-dessous (colonnes en Go).", "Get-PSDrive Z | Select-Object @{n='Utilise Go';e={[math]::Round($_.Used/1GB)}}, @{n='Libre Go';e={[math]::Round($_.Free/1GB)}}"],
    ["Comparez avec les seuils : au-dessus de 100 Go libres, rien à faire ; entre 50 et 100 Go, prévoir un tri ; sous 50 Go, faire de la place sans attendre.", ""],
    ["Pour faire de la place : les plus gros dossiers sont les sauvegardes des iPhone et iPad (Backup_iPad_iPhone_A_B) et les copies des photos (Sav Photos …). Ne supprimez rien sans avoir vérifié qu'une autre copie existe (iCloud, sauvegarde du PC) : demandez à Claude un tri méthodique. Ne touchez jamais au dossier VMs ni au fichier sommeil-server.qcow2.", ""],
    ["Si la place manque durablement : acheter un second disque pour la Freebox et y déplacer le serveur, avec un plan écrit (voir la tâche « Agrandir le disque du serveur »).", ""],
    ["Touchez « Fait », avec en remarque la place libre relevée.", ""],
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
