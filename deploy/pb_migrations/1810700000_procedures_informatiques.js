/// <reference path="../pb_data/types.d.ts" />

// Procédures informatiques pas à pas (CDC 3.4 : « écrites par Claude, dans
// le même format, et tenues à jour quand une commande change »), 29/10/2026.
// Ajoutées seulement aux tâches qui n'ont encore aucune étape : une procédure
// déjà écrite ou modifiée par le propriétaire n'est jamais touchée.
// Les commandes s'appuient sur l'état réel du serveur au 29/10/2026 (serveur
// « bmlab », 5 PocketBase en 0.40.6, Caddy bloqué dans apt, certificats par
// le port 443) ; à tenir à jour quand une commande change.
// Aucun secret : les étapes disent où les trouver.
migrate((app) => {
  const SERVICES = "caddy pocketbase-accueil pocketbase-courses pocketbase-immat pocketbase-jardin pocketbase-pilotage"
  const INVENTAIRE_PB = "for s in $(systemctl list-unit-files --type=service --no-legend 'pocketbase*' | awk '{print $1}'); do b=$(systemctl show -p ExecStart --value $s | grep -o '/opt/[^ ]*/pocketbase' | head -1); echo \"$s | $(systemctl is-active $s) | $(\"$b\" --version 2>/dev/null)\"; done"

  // [début du titre, étapes [texte, commande]]
  const PROCEDURES = [
    ["Mises à jour du système", [
      ["Avant de commencer : sur l'accueil du Pilotage, ouvrez « Cette nuit » ; la ligne « Mises à jour ordinaires » dit combien de mises à jour attendent. Choisissez un moment calme : un site peut être coupé quelques secondes.", ""],
      ["Sur le PC, ouvrez PowerShell et connectez-vous au serveur.", "ssh bmlab"],
      ["Vérifiez que Caddy est toujours bloqué dans apt : le mot « caddy » doit s'afficher. S'il ne s'affiche pas, arrêtez-vous et demandez à Claude (risque de panne comme le 23/10/2026).", "apt-mark showhold"],
      ["Récupérez la liste des mises à jour et regardez ce qui sera installé (le mot de passe du compte bmlab est demandé, rien ne s'affiche pendant la frappe).", "sudo apt update && apt list --upgradable"],
      ["Installez. Si apt pose une question sur un fichier de configuration modifié, répondez N (garder la version actuelle) et signalez-le à Claude.", "sudo apt upgrade"],
      ["Regardez si le système demande un redémarrage : « oui » ou « non » s'affiche.", "test -f /var/run/reboot-required && echo oui || echo non"],
      ["Seulement si « oui » : redémarrez, de préférence le soir (tous les sites coupés une à deux minutes), puis reconnectez-vous avec ssh bmlab au bout de deux minutes.", "sudo reboot"],
      ["Vérifiez que tout tourne : une ligne « active » par service, six en tout.", "systemctl is-active " + SERVICES],
      ["Vérifiez sur le téléphone : UptimeRobot tout vert ; le lendemain matin, « Cette nuit » sur l'accueil. Puis touchez « Fait » ici, avec en remarque le nombre de paquets mis à jour.", ""],
    ]],
    ["Revue de sécurité trimestrielle", [
      ["But : vérifier tous les trois mois que rien ne s'est dégradé sur les sites et le serveur. Méthode : chapitre 23 du cahier des charges de Puy-Saint-Vincent (C:\\Dev\\site-accueil-appartement\\docs\\CDC.md), appliquée à tous les sites. Prévoir une demi-journée avec Claude.", ""],
      ["Ouvrez une session Claude dans le projet Puy-Saint-Vincent et demandez : « Revue de sécurité trimestrielle, méthode du chapitre 23, pour tous les sites : psv, vitrine, immat, courses, pilotage, jardin ». Claude proposera si besoin une session par projet.", ""],
      ["La revue doit couvrir, pour chaque site : en-têtes de sécurité, fichiers exposés, règles d'accès des PocketBase, console d'administration et accès superuser fermés depuis Internet (réponse 404), tests sans danger sur la production (lecture, une connexion bidon, une courte rafale), jamais d'écriture.", ""],
      ["Composants : versions de PocketBase, Caddy, Debian et des bibliothèques des sites, failles connues (CVE). Faites la tâche « Montée de version » juste après la revue.", ""],
      ["Comptes et accès : comptes du serveur, mots de passe d'application Shadow Drive (un par projet), clés Healthchecks.io, consoles d'administration. Révoquez ce qui ne sert plus.", ""],
      ["Surveillance : UptimeRobot (6 sondes vertes), Healthchecks.io (contrôles de la nuit, e-mail du matin, sauvegarde du PC), comptes rendus des 90 derniers jours dans l'écran « Contrôles de la nuit ».", ""],
      ["Claude note le résultat dans le tableau 23.5 du cahier des charges PSV. Touchez ensuite « Fait » ici, avec en remarque le nombre de points trouvés, corrigés et restants.", ""],
    ]],
    ["Montée de version", [
      ["Quand : avec la revue trimestrielle, ou tout de suite si les contrôles de la nuit signalent une version avec correction de sécurité. Jamais automatiquement (incident du 23/10/2026). Chaque site est coupé quelques secondes.", ""],
      ["Sur le PC : ssh bmlab. Puis l'inventaire des PocketBase et de leurs versions.", INVENTAIRE_PB],
      ["Lisez les notes de version sur github.com/pocketbase/pocketbase/releases, entre la version installée et la nouvelle. Si la série change (ex. 0.40 vers 0.41), elle peut casser un projet : faites-la d'abord essayer sur le PC dans une session Claude du projet, comme pour Immatriculation le 29/10/2026.", ""],
      ["Téléchargez la nouvelle version et vérifiez son empreinte. Remplacez 0.40.6 par le numéro voulu. La ligne doit finir par « OK » ; sinon, arrêtez-vous.", "V=0.40.6; mkdir -p /tmp/pb$V && cd /tmp/pb$V && wget -q https://github.com/pocketbase/pocketbase/releases/download/v$V/pocketbase_${V}_linux_arm64.zip https://github.com/pocketbase/pocketbase/releases/download/v$V/checksums.txt && sha256sum --ignore-missing -c checksums.txt && unzip -o -q pocketbase_${V}_linux_arm64.zip pocketbase && ./pocketbase --version"],
      ["Le Pilotage d'abord, pour essai. L'ancien programme est gardé à côté (pocketbase.avant). Attendu : « active », la nouvelle version, « API is healthy ».", "V=0.40.6; D=/opt/pocketbase-pilotage; sudo cp -p $D/pocketbase $D/pocketbase.avant && sudo systemctl stop pocketbase-pilotage && sudo install -o $(stat -c %U $D) -g $(stat -c %G $D) -m 755 /tmp/pb$V/pocketbase $D/pocketbase && sudo systemctl start pocketbase-pilotage && sleep 3 && systemctl is-active pocketbase-pilotage && $D/pocketbase --version && curl -s http://127.0.0.1:8095/api/health"],
      ["Puis les quatre autres, un par un ; la boucle s'arrête au premier problème.", "V=0.40.6; for P in accueil:8092 courses:8094 immat:8093 jardin:8096; do N=${P%%:*}; PORT=${P##*:}; D=/opt/pocketbase-$N; echo \"== $N\"; sudo cp -p $D/pocketbase $D/pocketbase.avant && sudo systemctl stop pocketbase-$N && sudo install -o $(stat -c %U $D) -g $(stat -c %G $D) -m 755 /tmp/pb$V/pocketbase $D/pocketbase && sudo systemctl start pocketbase-$N && sleep 3 && systemctl is-active pocketbase-$N && $D/pocketbase --version && curl -s http://127.0.0.1:$PORT/api/health && echo || break; done"],
      ["En cas de problème sur un site : remettez l'ancien programme. Remplacez NOM par accueil, courses, immat, jardin ou pilotage.", "N=NOM; D=/opt/pocketbase-$N; sudo systemctl stop pocketbase-$N && sudo cp -p $D/pocketbase.avant $D/pocketbase && sudo systemctl start pocketbase-$N && systemctl is-active pocketbase-$N"],
      ["Caddy : vérifiez qu'il reste bloqué dans apt (« caddy » s'affiche), gardez une copie, puis mettez-le à jour par « caddy upgrade », jamais par apt. Le module infomaniak doit encore apparaître à la fin.", "apt-mark showhold && caddy version && sudo cp -p /usr/bin/caddy /usr/bin/caddy.avant && sudo caddy upgrade && caddy version && caddy list-modules | grep infomaniak"],
      ["Contrôlez la configuration, puis redémarrez Caddy : tous les sites sont coupés 2 à 3 secondes. Attendu : « active ».", "sudo caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile && sudo systemctl restart caddy && sleep 3 && systemctl is-active caddy"],
      ["En cas de problème avec Caddy : remettez l'ancienne version.", "sudo cp -p /usr/bin/caddy.avant /usr/bin/caddy && sudo systemctl restart caddy && systemctl is-active caddy"],
      ["Bibliothèques des sites (pdf.js de Courses, contenu de vendor/ de PSV…) : liste au tableau 23.3 du cahier des charges PSV. Leur mise à jour se fait dans une session Claude du projet concerné.", ""],
      ["Vérifiez : UptimeRobot tout vert, accueil du Pilotage ; le lendemain, les contrôles de la nuit. Faites le ménage des fichiers téléchargés. Puis « Fait » ici, avec les nouvelles versions en remarque.", "rm -rf /tmp/pb*"],
    ]],
    ["Test de restauration d'une sauvegarde", [
      ["But : prouver qu'une sauvegarde se relit vraiment. Un projet par trimestre, à tour de rôle (PSV, Courses, Pilotage) : notez lequel dans la remarque de « Fait ». Tout se passe sur le PC, sans toucher aux sites.", ""],
      ["Les copies chiffrées sont sur le Shadow Drive dédié (lecteur P:) : « SAV site psv.bmlab.fr chiffre », « SAV site courses.bmlab.fr chiffre », « SAV pilotage.bmlab.fr chiffre ». Il faut sur le PC le « remote » de déchiffrement rclone du projet (psv-chiffre, courses-chiffre ; pour le Pilotage, le créer une fois comme dans la notice de Courses, section 8) et ses deux phrases secrètes (gestionnaire de mots de passe).", ""],
      ["Dans PowerShell, listez les sauvegardes (exemple pour Courses ; remplacez courses-chiffre par psv-chiffre ou pilotage-chiffre).", "rclone lsf courses-chiffre:"],
      ["Déchiffrez la plus récente dans un dossier au chemin court. Remplacez NOM_DU_FICHIER.", "rclone copy \"courses-chiffre:NOM_DU_FICHIER.zip\" C:\\Restauration"],
      ["Décompressez le zip dans C:\\Restauration\\pb_data (chemin court obligatoire : sinon, la limite de 260 caractères de Windows coupe les miniatures). Mettez dans C:\\Restauration le pocketbase.exe pour Windows de la même version que le serveur (github.com/pocketbase/pocketbase/releases, fichier windows_amd64, empreinte vérifiée).", ""],
      ["Lancez une PocketBase locale sur cette copie, puis ouvrez http://127.0.0.1:8099/_/ dans le navigateur et connectez-vous avec le compte superuser du site (même mot de passe que sur le serveur).", "C:\\Restauration\\pocketbase.exe serve --http=127.0.0.1:8099 --dir=C:\\Restauration\\pb_data"],
      ["Vérifiez : nombre de fiches proche de la réalité, une fiche récente présente, une photo ou un fichier s'ouvre. Puis Ctrl + C dans PowerShell pour arrêter.", ""],
      ["Effacez tout C:\\Restauration : il contient des données personnelles en clair. Puis « Fait » ici, avec en remarque le projet testé, la date de la sauvegarde et le résultat.", "Remove-Item -Recurse -Force C:\\Restauration"],
    ]],
    ["Test de restauration de la sauvegarde du PC", [
      ["La méthode complète est dans C:\\Sauvegarde\\Documentation\\Strategie-sauvegarde-restauration.pdf. Voici l'essentiel.", ""],
      ["Lancez l'outil « Retrouver un fichier » (raccourci sur le bureau, ou C:\\Sauvegarde\\Retrouver-un-fichier.ps1). Restaurez quelques fichiers récents et anciens, de dossiers différents : documents, photos, projets de C:\\Dev.", ""],
      ["Les fichiers restaurés arrivent dans C:\\Restauration : ouvrez-les et comparez-les aux originaux.", ""],
      ["Vérifiez aussi Veeam (menu ☰) : une sauvegarde récente sur le disque du mois. Rappel de la rotation : SAV_PC_MOIS_PAIRS les mois pairs, SAV_PC_MOIS_IMPAIRS les mois impairs, jamais branchés ensemble.", ""],
      ["Videz C:\\Restauration, puis « Fait » ici, avec en remarque ce qui a été restauré et le résultat.", "Remove-Item -Recurse -Force C:\\Restauration"],
    ]],
    ["Renouvellement des secrets", [
      ["But : changer une fois par an les secrets qui ouvrent quelque chose, pour limiter les dégâts d'une fuite passée inaperçue. Un secret à la fois, avec une vérification après chacun. Les secrets vont dans le gestionnaire de mots de passe, jamais dans une fiche.", ""],
      ["Relais e-mail contact@bmlab.fr : changez son mot de passe dans la messagerie Infomaniak, puis reportez-le dans la console de chaque PocketBase qui envoie des e-mails (Settings › Mail settings : PSV, Pilotage, Jardin, et Courses si elle en envoie), avec « Send test email » à chaque fois. Console par tunnel, PORT = 8092 pour PSV, 8095 pour le Pilotage, 8096 pour Jardin.", "ssh -L PORT:127.0.0.1:PORT bmlab"],
      ["Clé secrète Cloudflare Turnstile de PSV : Cloudflare › Turnstile › widget psv.bmlab.fr › « Rotate Secret Key », puis reportez-la sur le serveur avec Claude, dans une session du projet PSV.", ""],
      ["Mots de passe d'administration : compte superuser de chaque PocketBase (console › en haut à droite), compte de connexion au Pilotage (console du Pilotage › users), compte bmlab du serveur (commande ci-dessous, une fois connecté par ssh bmlab).", "passwd"],
      ["Mots de passe d'application Shadow Drive (un par projet : PSV, Courses, Pilotage, Jardin) : créez-en un nouveau sur le site de Shadow Drive (compte dédié aux sauvegardes), mettez-le dans rclone sur le serveur avec Claude, vérifiez une sauvegarde, puis révoquez l'ancien.", ""],
      ["Healthchecks.io : créez une nouvelle clé d'API en lecture seule (Settings › API Access), supprimez l'ancienne, collez la nouvelle dans Réglages › Surveillance et gel, puis touchez « Vérifier la sauvegarde du PC maintenant ».", ""],
      ["Le lendemain : e-mail du matin et contrôles de la nuit tout verts. Puis « Fait » ici, avec en remarque la liste de ce qui a été changé (jamais les secrets eux-mêmes).", ""],
    ]],
    ["Renouvellement du nom de domaine bmlab.fr", [
      ["Le nom de domaine bmlab.fr prend fin le 10 septembre de chaque année. Sans renouvellement, TOUS les sites et l'adresse contact@bmlab.fr s'arrêtent.", ""],
      ["Manager Infomaniak › Noms de domaine › bmlab.fr : regardez la date d'échéance et si le renouvellement automatique est activé.", ""],
      ["Vérifiez que le moyen de paiement enregistré est encore valable (date de fin de la carte) ; sinon, mettez-le à jour.", ""],
      ["Renouvelez, ou laissez le renouvellement automatique se faire, puis vérifiez que la nouvelle date d'échéance est bien l'année suivante.", ""],
      ["Touchez « Fait » ici, avec la facture en justificatif.", ""],
    ]],
    ["Ménage RGPD dans Gmail", [
      ["But : respecter les durées de conservation annoncées par la politique de confidentialité de psv.bmlab.fr (messages de contact : 12 mois). Tous les trimestres.", ""],
      ["Ouvrez Gmail (le compte qui reçoit les messages du site) et tapez cette recherche :", "subject:\"[Site PSV]\" older_than:1y"],
      ["Cochez la case en haut de la liste, puis « Sélectionner toutes les conversations correspondant à cette recherche », et supprimez.", ""],
      ["Videz la corbeille (Corbeille › « Vider la corbeille maintenant ») : sinon, les messages restent encore 30 jours.", ""],
      ["Touchez « Fait » ici, avec en remarque le nombre de messages supprimés.", ""],
    ]],
    ["Vérifier les liens de psv.bmlab.fr", [
      ["But : trouver les liens cassés que personne n'a encore cliqués (fiches tourisme, notices PDF). La détection au clic du site reste en place à côté.", ""],
      ["Ouvrez une session Claude dans le projet Puy-Saint-Vincent et demandez : « Vérification trimestrielle des liens de psv.bmlab.fr : tous les liens externes des fiches et les notices PDF ; liste des liens cassés ou redirigés, avec la fiche concernée ».", ""],
      ["Pour chaque lien cassé : cherchez la bonne adresse (site du commerce ou de l'activité), corrigez la fiche dans l'administration du site, ou retirez le lien.", ""],
      ["Touchez « Fait » ici, avec en remarque le nombre de liens vérifiés et corrigés.", ""],
    ]],
    ["Vérifier tous les tarifs et informations datées du site PSV", [
      ["But : que les prix et horaires affichés soient ceux de la saison qui arrive (mi-novembre pour l'hiver, mi-mai pour l'été).", ""],
      ["Rassemblez les nouvelles informations : sites des remontées mécaniques, de l'office de tourisme, des commerces et activités. Gardez les sources (captures, PDF) pour le bilan.", ""],
      ["Ouvrez une session Claude dans le projet Puy-Saint-Vincent et demandez : « Mise à jour des tarifs et horaires de la saison, avec bilan avant/après », en lui donnant les sources.", ""],
      ["Relisez le bilan avant/après, validez, puis vérifiez quelques fiches sur le site.", ""],
      ["Touchez « Fait » ici, avec le bilan en justificatif.", ""],
    ]],
  ]

  // Titre à jour pour le renouvellement des secrets : il n'y a plus de
  // jeton Infomaniak sur le serveur depuis le 28/10/2026.
  app.findRecordsByFilter("taches", "titre = {:t}", "", 5, 0, {
    t: "Renouvellement des secrets : clé Turnstile, mot de passe du relais e-mail, mots de passe d'administration, jeton Infomaniak",
  }).forEach((t) => {
    t.set("titre", "Renouvellement des secrets : relais e-mail, Turnstile, mots de passe d'administration, Shadow Drive, Healthchecks.io")
    app.save(t)
  })

  // Il n'y a pas de PocketBase « sandbox » sur le serveur ; jardin est arrivé le 28/10/2026.
  app.findRecordsByFilter("taches", "titre = {:t}", "", 5, 0, {
    t: "Montée de version : PocketBase (accueil, immat, courses, sandbox, pilotage), Caddy (caddy upgrade), bibliothèques",
  }).forEach((t) => {
    t.set("titre", "Montée de version : PocketBase (accueil, courses, immat, jardin, pilotage), Caddy (caddy upgrade), bibliothèques")
    app.save(t)
  })

  const etapes = app.findCollectionByNameOrId("etapes")
  PROCEDURES.forEach((p) => {
    app.findRecordsByFilter("taches", "titre ~ {:t}", "", 10, 0, { t: p[0] }).forEach((t) => {
      if (t.getString("titre").indexOf(p[0]) !== 0) return
      if (app.countRecords("etapes", $dbx.hashExp({ tache: t.id })) > 0) return
      p[1].forEach((x, i) => {
        const r = new Record(etapes)
        r.set("tache", t.id)
        r.set("ordre", (i + 1) * 10)
        r.set("texte", x[0])
        r.set("commande", x[1])
        app.save(r)
      })
    })
  })
}, (app) => {
  // Retour en arrière volontairement vide : les procédures peuvent avoir été
  // complétées par le propriétaire.
})
