/// <reference path="../pb_data/types.d.ts" />

// Place sur le disque du serveur (validé par le propriétaire le 30/10/2026,
// CDC 0.22) : le disque ne fait que 15 Go, et chaque fichier compte aussi
// dans les sauvegardes gardées sur le serveur (3 pour le Pilotage).
//  1) vidéos des procédures limitées à 100 Mo (250 Mo avant) ;
//  2) deux tâches : agrandir le disque du serveur, et limiter la taille des
//     envois au niveau de Caddy, site par site (chacune avec sa procédure).
// Chaque tâche n'est créée qu'une fois.
migrate((app) => {
  const etapesCol = app.findCollectionByNameOrId("etapes")
  const video = etapesCol.fields.getByName("video")
  if (video && video.maxSize > 104857600) {
    video.maxSize = 104857600
    video.help = "Vidéo courte filmée au téléphone (1 minute environ, 100 Mo au plus : chaque Mo compte aussi dans les sauvegardes du serveur). Plus longue : utiliser le lien."
    app.save(etapesCol)
  }

  function domaine(nom) {
    try {
      return app.findFirstRecordByFilter("domaines", "nom = {:n}", { n: nom })
    } catch (e) {
      return null
    }
  }

  function creer(titre, nomDomaine, valeurs, etapes) {
    if (app.findRecordsByFilter("taches", "titre = {:t}", "", 1, 0, { t: titre }).length) return
    const d = domaine(nomDomaine)
    if (!d) return
    const t = new Record(app.findCollectionByNameOrId("taches"))
    const tout = Object.assign({ titre: titre, domaine: d.id, mode: "unique", souplesse: "souple", tolerance: 15, etat: "active" }, valeurs)
    Object.keys(tout).forEach((k) => t.set(k, tout[k]))
    app.save(t)
    etapes.forEach((x, i) => {
      const r = new Record(etapesCol)
      r.set("tache", t.id)
      r.set("ordre", (i + 1) * 10)
      r.set("texte", x[0])
      r.set("commande", x[1])
      app.save(r)
    })
  }

  creer("Agrandir le disque du serveur (15 Go aujourd'hui)", "Serveur", {
    priorite: "important", echeance: "2026-11-30 00:00:00.000Z",
    notes: "Relevé du 30/10/2026 : disque de 15 Go, 7,9 Go libres ; mémoire 973 Mo ; 1 processeur. Les contrôles de la nuit alertent sous 5 Go (attention) et 3 Go (alerte) libres, et si l'espace baisse de plus de 1 Go en un jour.",
  }, [
    ["But : passer le disque du serveur de 15 Go à une taille plus confortable (par exemple 64 Go), pour les photos, pièces jointes et sauvegardes à venir de tous les sites.", ""],
    ["Attention : le serveur est une machine virtuelle de la Freebox Delta. Le cahier des charges de PSV (version 3.83) prévient que modifier ses réglages dans Freebox OS peut relancer l'installation automatique et recréer l'ancien compte. Ne touchez à rien dans Freebox OS avant d'avoir un plan écrit avec Claude, dans une session dédiée.", ""],
    ["Avant toute chose : vérifiez que les sauvegardes de la nuit de tous les projets sont vertes (écran « Contrôles de la nuit ») et regardez la place libre sur le disque de la Freebox elle-même.", ""],
    ["Pendant l'opération, suivez le plan pas à pas. Ensuite, vérifiez que le système voit la nouvelle taille (colonne Size) :", "df -h /"],
    ["Vérifiez que tous les sites répondent (UptimeRobot tout vert), puis « Fait » ici, avec en remarque l'ancienne et la nouvelle taille.", ""],
  ])

  creer("Limiter la taille des envois au niveau de Caddy, site par site", "Tous les projets", {
    priorite: "important", echeance: "2026-11-30 00:00:00.000Z",
    notes: "Tailles maximales des fichiers relevées le 30/10/2026 : PSV 5 Mo par pièce jointe du formulaire de contact (10 Mo pour les factures de l'administration), Courses 20 Mo par ticket, Jardin 5 Mo par photo, Pièces euro 2 Mo par image, Pilotage 20 Mo par justificatif et 100 Mo par vidéo.",
  }, [
    ["But : une barrière de plus contre un envoi trop gros ou répété. Caddy refuse la requête avant même qu'elle n'arrive à PocketBase (directive request_body max_size dans le bloc Caddy de chaque site).", ""],
    ["Pour chaque projet (PSV, vitrine, Immatriculation, Courses, Jardin, Pièces euro, Pilotage), ouvrez une session Claude dans le projet et demandez : « Limiter la taille des requêtes dans le bloc Caddy (request_body max_size), d'après les tailles maximales des champs de fichiers et le nombre de fichiers envoyés en une fois ». Les tailles actuelles sont dans les notes de cette tâche.", ""],
    ["Après chaque changement sur le serveur : contrôle de la configuration, rechargement de Caddy, puis essai d'un envoi normal (une pièce jointe, une photo) pour vérifier qu'il passe toujours.", "sudo caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile && sudo systemctl reload caddy"],
    ["« Fait » ici, avec en remarque la liste des limites posées site par site.", ""],
  ])
}, (app) => {
  // Retour en arrière volontairement vide : on ne supprime jamais les
  // données du propriétaire.
})
