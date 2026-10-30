# Cahier des charges — Pilotage (échéances et entretien, tous domaines)

Version 0.20 — 30/10/2026 · Validée par le propriétaire ; étapes 1, 2 et 3 installées (application 1.3.0) ; procédures informatiques chargées ; rotation des disques du PC ajoutée ; Pièces euro ajouté aux contrôles de la nuit

**Historique des versions**
- Version 0.20 (30/10/2026) : **tâche de ménage après le refus d'indexation**, à la demande du propriétaire : « Supprimer la copie de secours /etc/caddy/Caddyfile.avant-noindex » (domaine Serveur, 🟢 confort, ponctuelle, échéance le 06/11/2026, souple ± 7 jours) et sa procédure en 4 étapes (vérifier les sites, `ssh bmlab`, `sudo rm`, contrôle par `ls`). Migration `1810900000_menage_noindex.js`, créée une seule fois, sur le modèle de `1810800000_rotation_disques.js`. Sécurité : sans objet.
- Version 0.19 (30/10/2026) : **site interdit aux moteurs de recherche**, à la demande du propriétaire (contrôle de tous les sites de bmlab.fr : seul Immatriculation n'avait aucun refus) : les sites privés de bmlab.fr refusent l'indexation par les moteurs de recherche ; seule la vitrine hameau-ecrins-405.bmlab.fr reste ouverte. (1) En-tête « X-Robots-Tag: noindex, nofollow, noarchive » ajouté au bloc Caddy, donc sur toutes les réponses (pages, PDF, photos, API), y compris les fichiers où une balise de page est impossible. (2) `robots.txt` revu : Google et Bing peuvent lire les pages pour voir ce refus (un `Disallow: /` les en empêchait, et une adresse trouvée par un lien pouvait rester affichée seule dans les résultats) ; tous les autres robots, dont ceux des intelligences artificielles, restent refusés. Déploiement : `pilotage.caddy` et `robots.txt`. Sécurité : moins d'exposition (aucune page du site ne doit apparaître dans un moteur).
- Version 0.18 (29/10/2026) : **nouveau projet Pièces euro** (`C:\Dev\pieces-euro`, pieces-euro.bmlab.fr, PocketBase `pocketbase-pieces` port 8097) **ajouté aux contrôles de la nuit** (`controles_nuit.py`) : site et certificat (liste `SITES`), sauvegarde PocketBase et copie chiffrée sur Shadow Drive (liste `SAUVEGARDES`, état `/var/lib/sauvegarde-pieces/etat`, script `sauvegarde_pieces.sh` à 3 h 55) ; le service `pocketbase-pieces` est repris tout seul par le contrôle « Services ». Nouveau contrôle **« robots de nuit »** (liste `ROBOTS`) pour les services lancés par un minuteur, invisibles du contrôle « Services » : `pieces-robot` (1 h 30) ; 🔴 si son minuteur ne tourne pas, si son dernier passage a fini en erreur (code de sortie non nul) ou s'il date de plus de 48 h ; ℹ️ s'il n'est pas encore passé depuis un redémarrage du serveur. Script à déployer seulement une fois Pièces euro installé sur le serveur (sinon fausses alertes). Sécurité : sans objet (lecture seule de l'état systemd et des sauvegardes, aucun secret ajouté).
- Version 0.17 (29/10/2026) : **rotation des disques de sauvegarde du PC**, à la demande du propriétaire : nouvelle tâche « Échanger le disque de sauvegarde du PC (mois pairs / mois impairs) » (domaine PC et sauvegardes, 🟠, à dates fixes « 31 » = dernier jour de chaque mois, souple ± 1 jour, premier rappel 2 jours avant, préparation « rapporter de l'autre lieu le disque du mois qui commence » 3 jours avant, première échéance le 31/10/2026) et sa procédure en 7 étapes, tirées de la documentation de sauvegarde du PC (§ 8 : SAV_PC_MOIS_IMPAIRS = Seagate, SAV_PC_MOIS_PAIRS = Sabrent, lettre D, éjection forcée par Stop-Service VeeamEndpointBackupSvc et fsutil volume dismount D:). Migration `1810800000_rotation_disques.js`, créée une seule fois, essayée sur la base locale. Sécurité : sans objet.
- Version 0.16 (29/10/2026) : **procédures informatiques écrites** (CDC 3.4), à la demande du propriétaire, chargées par la migration `1810700000_procedures_informatiques.js` dans les fiches qui n'ont encore aucune étape (une procédure déjà écrite n'est jamais touchée) : mises à jour du système (9 étapes), revue de sécurité trimestrielle (7), montée de version de PocketBase et de Caddy (12, avec retour en arrière), test de restauration d'une sauvegarde de site (8), test de restauration de la sauvegarde du PC (5), renouvellement des secrets (7), renouvellement du nom de domaine (5), ménage RGPD dans Gmail (5), vérification des liens de psv (4), tarifs de la saison (5 pour l'hiver, 5 pour l'été). Commandes alignées sur l'état réel du 29/10/2026 (serveur bmlab, 5 PocketBase, Caddy bloqué dans apt). Titres mis à jour : plus de jeton Infomaniak dans le renouvellement des secrets, jardin au lieu d'une « sandbox » inexistante dans la montée de version. Essayé sur la base locale (bon nombre d'étapes par fiche, migration rejouée sans doublon). Sécurité : aucun secret dans les procédures ; elles disent seulement où les trouver.
- Version 0.15 (29/10/2026) : **étape 3 installée** : migration et règles déployées, version 1.3.0 en ligne (fausse adresse d'agenda refusée, 404, vérifié depuis Internet) ; clé Healthchecks.io en lecture seule saisie par le propriétaire, vérification immédiate réussie (« la sauvegarde a signalé sa réussite cette nuit ») ; abonnement de l'agenda fait sur l'iPhone et l'iPad. Remarque d'installation : sur le PC, l'ancienne page restait affichée tant qu'elle n'était pas rechargée (Ctrl + F5). **Les trois étapes du chapitre 10 sont installées.** Sécurité : sans objet (installation de la version 0.14).
- Version 0.14 (29/10/2026) : **étape 3 construite** (demande du propriétaire : « on attaque l'étape 3 »), application 1.3.0. 1) **Agenda abonné** (3.5) : route `GET /api/pilotage/calendrier/{jeton}.ics` (jeton de 48 caractères tiré au hasard dans le navigateur, gardé dans `reglages.jeton_calendrier`, comparé à temps constant ; mauvais jeton : 404), flux iCalendar conforme (lignes pliées à 75 octets, actualisation toutes les 4 h) : échéances, préparations et relances des 12 prochains mois, retards affichés le jour même ; titre, pastille de priorité, date et lien vers la fiche seulement. Réglages > Agenda : créer l'adresse, « S'abonner dans l'agenda » (lien webcal:// pour iOS), copier l'adresse, changer l'adresse (coupe les anciens abonnements). 2) **Rapport de la sauvegarde du PC** (5.1) : le script du PC (`C:\Sauvegarde\Sauvegarde-Nuit.ps1`, hors dépôt, non modifié) envoie déjà chaque nuit son signal et son résumé au contrôle Healthchecks.io « Sauvegarde PC » ; le Pilotage le lit chaque matin avant l'e-mail (clé d'API Healthchecks.io **en lecture seule**, `reglages.healthchecks_api`, nom du contrôle `reglages.healthchecks_pc`) et écrit le compte rendu « Sauvegarde du PC » dans les contrôles du jour (ok, en retard, en échec avec tâche « Réparer : Sauvegarde du PC » dans le domaine PC et sauvegardes) ; bouton « Vérifier la sauvegarde du PC maintenant » (`POST /api/pilotage/verifier-pc`, connexion requise). Le script de la nuit du serveur ne remplace plus ce compte rendu. Migration `1810600000_etape3.js`. Essayé sur le PC : jeton refusé (404) ou accepté (79 événements, aucune ligne de plus de 75 octets), création de l'adresse depuis l'écran, clé Healthchecks.io refusée signalée en clair. Sécurité : nouvelle route publique protégée par un jeton long et révocable, ne donnant que titres et dates ; clé Healthchecks.io en lecture seule gardée dans la base (jamais dans le dépôt) ; aucun changement sur le PC.
- Version 0.13 (29/10/2026) : **Immatriculation passée en PocketBase 0.40.6**, après essai du jeu sur le PC dans une session dédiée du projet Immatriculation (sa propre documentation en garde le détail) ; mise en production faite par le propriétaire. Les 5 PocketBase du serveur sont donc en 0.40.6 : la tâche « Réparer : Version de PocketBase » peut être marquée « Fait » dans l'application. Sécurité : correction Go 1.27.3 (autorité de certification eMudhra) en place partout.
- Version 0.12 (29/10/2026) : **montée de version de PocketBase**, guidée pas à pas (alerte des contrôles de la nuit du 29/10). Inventaire : 5 PocketBase (accueil, courses, immat, jardin, pilotage). Exécutable 0.40.6 ARM64 téléchargé et vérifié sur la liste officielle des empreintes ; Pilotage passé en premier pour essai, puis accueil (PSV), courses et jardin : les 4 en **0.40.6**, actifs, santé de l'API correcte, sites vérifiés depuis Internet ; anciens exécutables gardés à côté (`pocketbase.0.40.5`) pour revenir en arrière. **Immatriculation**, encore en 0.39.4 (sans la correction de sécurité de la 0.39.7), passée en **0.39.9** (dernière de la série, mêmes vérifications, ancien exécutable `pocketbase.0.39.4` gardé) ; le passage en 0.40 est différé : les notes de la 0.40.0 recommandent d'essayer d'abord l'application (lecture JSON de Go 1.27 pas entièrement compatible). La tâche « Réparer : Version de PocketBase » reste ouverte jusque-là (les contrôles la signalent sans la recréer). Sécurité : correction Go 1.27.3 (autorité de certification eMudhra) en place sur 4 instances sur 5 ; Immatriculation reçoit les corrections 0.39.7 à 0.39.9.
- Version 0.11 (29/10/2026) : **étape 2 installée sur le serveur**, guidée pas à pas avec le propriétaire : migration et règles du Pilotage, Caddy (route des contrôles fermée depuis Internet, 404 vérifié), secret `/etc/pilotage/secret` (root:pocketbase-pilotage, 640), `unattended-upgrades` avec `52pilotage-unattended-upgrades` (essai à blanc sans erreur, Caddy toujours bloqué), script et minuteur (premier passage : 16 comptes rendus ; prochain passage chaque nuit vers 5 h, heure de Paris). **Première alerte réelle** : PocketBase 0.40.6 (23/10/2026), recompilée avec Go 1.27.3 (correction de sécurité liée à la compromission de l'autorité de certification eMudhra) ; tâche critique « Réparer : Version de PocketBase » créée, montée de version à faire avec le propriétaire, jamais automatiquement. Commune de l'alerte de gel saisie dans les réglages. Healthchecks.io (compte existant) : contrôles « Pilotage contrôles de la nuit » (signal reçu) et « Pilotage e-mail du matin » (premier signal attendu le 30/10 à 7 h), période 1 jour, grâce 2 heures. UptimeRobot (compte existant, qui surveillait seulement psv) : sondes ajoutées pour pilotage, courses, jardin, immat et la vitrine, les 6 au vert. Application 1.2.1 : onglet « 🏠 Accueil » (au lieu de « Aujourd'hui ») et titre de l'en-tête cliquable vers l'accueil, demande du propriétaire qui ne trouvait pas le retour à l'accueil. Sécurité : surveillance externe en place ; les adresses de signal de vie ne donnent accès à rien.
- Version 0.10 (29/10/2026) : **étape 2 construite** (accord du propriétaire le 29/10 : « oui on y va »), application 1.2.0. Script `deploy/controles/controles_nuit.py` (Python 3, bibliothèque standard, root), lancé chaque nuit à 5 h, heure de Paris, par `pilotage-controles.timer` (service durci : écritures limitées à son état, aux journaux et au cache apt). Contrôles : sites en ligne (psv, vitrine, immat, courses, pilotage, jardin, interrogés sur le serveur lui-même), certificats (alerte à moins de 20 jours), sauvegardes de PSV, Courses, Pilotage et Jardin (dernière sauvegarde de moins de 48 h, taille au moins la moitié de la précédente, copie chiffrée Shadow Drive à jour d'après les fichiers d'état des scripts de chaque projet), Immatriculation signalée sans sauvegarde, espace disque (alerte sous 20 %), photos et vidéos du Pilotage (au-delà de 5 Go), mises à jour (corrections de sécurité installées dans les 24 h, en attente, ordinaires, Caddy toujours bloqué dans apt), redémarrage demandé (alerte après 7 jours), services Caddy et PocketBase (arrêtés, ou redémarrés au moins deux fois depuis la nuit précédente), versions de Caddy et de PocketBase (nouvelle version notée pour la revue, alerte si ses notes parlent de sécurité). Actions : journaux de plus de 14 jours et cache apt effacés ; mises à jour de sécurité Debian par `unattended-upgrades` (`52pilotage-unattended-upgrades` : sécurité seulement, Caddy exclu, pas de redémarrage automatique). Comptes rendus en clair envoyés à `POST /api/pilotage/controles` (directement sur 127.0.0.1, secret de `/etc/pilotage/secret` comparé à temps constant), collection `controles` gardée 90 jours ; une **alerte crée une tâche critique « Réparer : … »** (champ `taches.origine`, pas de doublon). E-mail du matin : partie « Contrôles de la nuit » (une ligne si tout va bien, détail sinon, résumé de la semaine le lundi) ; envoyé dès qu'un contrôle est à regarder ou manque. **Alerte de gel** (4.4) : champ `taches.alerte_gel` (coché pour l'hivernage de la piscine), commune saisie dans les réglages (jamais dans le dépôt), position trouvée par le géocodage Open-Meteo puis gardée, minimales des 7 jours ; partie « ❄️ Gel annoncé » dans l'e-mail. **Gardien du gardien** (7) : signal de vie Healthchecks.io après les contrôles (`/etc/pilotage/healthchecks-controles`, `/fail` si l'envoi échoue) et après l'e-mail du matin (Réglages > Surveillance et gel) ; comptes Healthchecks.io et UptimeRobot existants du propriétaire réutilisés (UptimeRobot ne surveillait que psv). Application : ligne « Cette nuit : … » en haut de l'accueil, écran « Contrôles de la nuit » (14 dernières nuits), réglages de la commune et du signal de vie, case « alerte gel » dans l'éditeur. Notice : `deploy/INSTALLATION.md`, « Étape 2 ». Essayé sur le PC : script en mode essai, réception refusée sans le bon secret (401), alertes → 6 tâches puis aucune en double au second passage, e-mail avec contrôles, géocodage de la commune, partie gel affichée avec une commune de montagne, écrans. Sécurité : nouvelle route serveur non exposée (Caddy 404) et protégée par un secret long lisible par root et le service seulement ; le script tourne en root mais en lecture seule hors ménage ; appels sortants vers Open-Meteo (nom de la commune seulement), GitHub (versions) et Healthchecks.io (signal vide) ; mises à jour de sécurité automatiques, jamais Caddy ni PocketBase.
- Version 0.9 (28/10/2026) : **deux évolutions demandées et validées par le propriétaire** (réponses du 28/10 : « 1 oui, 2 trois niveaux réglables, 3 les évolutions d'abord »), application 1.1.0. 1) **Fiches de référence**, sans échéance ni rappel (3.6) : nouveau genre de fiche (mode `reference`), avec procédure, photos, vidéos, matériel, contacts, notes et historique ; jamais dans l'accueil, le calendrier, « À compléter » ni les e-mails ; **nouvel onglet « Fiches »** (`repertoire.js`), qui remplace l'onglet « Ajouter » : toutes les fiches rangées par domaine, recherche par mot sans tenir compte des accents, filtres par domaine et par genre (tâches, références, terminées), boutons « ＋ Tâche » et « ＋ Fiche de référence ». 2) **Règles de rappel réglables** (4.5) : les trois priorités restent fixes, leurs règles se règlent dans Réglages > Règles de rappel (rappel en retard tous les N jours, 0 = lundi seulement ; premier rappel et jour J dans l'e-mail du matin ou non ; premier rappel par défaut, pour une tâche annuelle, tolérance proposée), avec retour aux règles d'origine ; les domaines étaient déjà modifiables (Réglages > Domaines). Migration `1810400000_references_regles.js` (valeur `reference` du mode, champ JSON `regles` des réglages, avec texte d'aide). Essayé sur la base locale : migration, création d'une fiche de référence (formulaire réduit aux champs utiles), recherche, fiche sans boutons d'échéance, enregistrement des règles et reprise de la tolérance dans une nouvelle tâche, e-mail d'essai avec les règles. Sécurité : sans objet (même surface ; les règles sont bornées côté pages et côté serveur, une valeur aberrante reprend la valeur d'origine).
- Version 0.8 (28/10/2026) : **sauvegarde hors site installée** (notice, section 7), avec le propriétaire : jeton Shadow Drive « Serveur Pilotage sauvegardes » sur le compte dédié, `/root/.config/rclone/pilotage.conf` (remotes `shadow-pilotage` et `pilotage-chiffre`, dossier `SAV pilotage.bmlab.fr chiffre`), script `sauvegarde_pilotage.sh` en crontab de root à 3 h 50 ; premier passage `OK`, 4 sauvegardes copiées. Notice précisée : chaque jeton Shadow Drive a son propre nom d'utilisateur (une erreur de consigne avait branché Jardin sur le jeton de Courses, corrigé ensuite). Sécurité : les données du Pilotage (procédures, photos, justificatifs) ont enfin une copie chiffrée hors site.
- Version 0.7 (28/10/2026) : **jeton Infomaniak supprimé** : tous les sites (psv, immat, courses, vitrine, pilotage, jardin) obtiennent désormais leur certificat par le port 443 ; jeton retiré du serveur et révoqué. La tâche « remplacer le jeton Infomaniak » (une seule fois) est donc sans objet : à clore dans l'application. Le contrôle de nuit des certificats reste utile (premiers renouvellements par le port 443 : psv vers le 09/11, immat vers le 20/11). Sécurité : un secret de moins.
- Version 0.6 (28/10/2026) : **Serveur renommé le 28/10/2026 : machine `sommeil-server` devenue `bmlab` (nom local `bmlab.home`), compte `freebox-sommeil` remplacé par le compte `bmlab` (sudo avec mot de passe), raccourci `ssh bmlab` dans `C:\Users\bmiof\.ssh\config` sur le PC**. Notice d'installation et CLAUDE.md passés à `scp … bmlab:/tmp/`, `ssh bmlab`, `ssh -L 8095:127.0.0.1:8095 bmlab`. Constat du 28/10 : la crontab de root ne contient que les sauvegardes de PSV (3 h 30) et de Courses (3 h 45) ; celle du Pilotage (section 7 de la notice, 3 h 50) **n'est toujours pas installée**. Ancien compte `freebox-sommeil` supprimé le jour même. Tâches à ajouter dans l'application : installer la sauvegarde du Pilotage, contrôles de nuit de Jardin (nouveau projet, `jardin.bmlab.fr`). Sécurité : `sudo` avec mot de passe, ancien compte verrouillé.
- Version 0.5 (26/10/2026) : **échéances du site PSV demandées par le propriétaire**, relayées par la session d'audit de sécurité PSV. 1) Nouvelle tâche trimestrielle (15/01, 15/04, 15/07, 15/10, prochaine le 15/01/2027) : vérification proactive des liens de psv.bmlab.fr, surtout les liens externes (fiches tourisme, notices PDF), en complément de la détection existante côté PSV (`broken_link_reports.pb.js` et `lang.js` : e-mail quand un locataire clique un lien cassé), qui ne voit pas les liens jamais cliqués. 2) Vérification semestrielle de tous les tarifs du site à la mi-mai et à la mi-novembre : elle existait déjà sous la forme des deux tâches « Informations datées » (15/05 et 15/11), renommées « Vérifier tous les tarifs et informations datées du site PSV avant l'hiver / l'été ». Migration `1810300000_psv_liens_tarifs.js` (ne crée rien en double, ne renomme que les titres d'origine), essayée sur la base locale. Installation sur le serveur faite par le propriétaire le 23/10 (console, relais e-mail, sauvegardes, compte de connexion). Sécurité : sans objet (contenu seulement).
- Version 0.4 (23/10/2026) : **étape 1 construite**, application 1.0.0 (détail au chapitre 12). Pages sans outil de construction (`public/`), même méthode que Courses ; calcul des échéances dans un seul fichier, `echeances.js`, utilisé à la fois par les pages et par le serveur (copié dans `pb_hooks`) ; migrations `1810000000_comptes.js` (inscription fermée, double authentification par code e-mail, session de 30 jours), `1810100000_collections.js` (domaines, taches, etapes, historique, reglages, envois, toutes les colonnes avec texte d'aide) et `1810200000_inventaire.js` (13 domaines, 47 tâches du chapitre 9, chargées une seule fois) ; règles du serveur `pilotage.pb.js` + `pilotage.js` (événements de l'historique → tâche, e-mail du matin, essai d'e-mail) ; notice `deploy/INSTALLATION.md`. **Écarts assumés** avec la proposition : étapes réordonnées par flèches ↑ ↓ (le glisser est peu fiable sur iPhone) ; vidéos jusqu'à 250 Mo (une vidéo d'iPhone de 2 minutes dépasse souvent 100 Mo) ; le mode « avant une date limite » du 4.1 est rendu par une date impérative (4.2) sur un mode « après » ou « à dates fixes » ; 3 sauvegardes gardées sur le serveur au lieu de 7, car elles contiennent les photos et vidéos ; certificat obtenu par le port 443, sans jeton Infomaniak. **Essai complet sur le PC** (PocketBase 0.40.5 pour Windows, empreinte vérifiée, base et faux serveur d'e-mails locaux, supprimés ensuite) : inventaire chargé, inscription publique refusée (403), lecture sans connexion vide, connexion mot de passe puis code, « Fait » avec justificatif PDF (prochaine échéance calculée), report sans raison refusé, date limite gardée après le report d'une tâche impérative puis effacée à la réalisation, attente et fin d'attente, date de réalisation future refusée, e-mail d'essai reçu, écriture du journal des envois refusée au client ; écrans essayés au format téléphone (accueil, fiche, préparation faite, procédure, calendrier, réglages, nouvelle tâche). Sécurité : nouvelle application exposée sur Internet (`pilotage.bmlab.fr`) : connexion obligatoire avec double authentification, inscription fermée, console et API superuser refusées par Caddy (404), seules les routes de l'application exposées, fichiers protégés par jeton, en-têtes de sécurité et CSP sans script en ligne, service systemd durci et limité à son dossier, aucun secret dans le dépôt (adresse du destinataire saisie dans l'application).
- Version 0.3 (23/10/2026) : **version 0.2 validée par le propriétaire** ; l'étape 1 peut commencer. Réponses complémentaires : roues hiver du Tiguan pas encore posées, chaînes de l'Eos pas encore dans le coffre (les deux avant le 01/11/2026) ; rien n'est anticipé pour le ramonage, la piscine ni le paysagiste en 2026 (préparations à faire immédiatement) ; **pompe à chaleur** (pas de chaudière), déjà en route pour l'hiver 2026-2027 : **entretien obligatoire tous les 2 ans** pour une pompe à chaleur de 4 à 70 kW (décret 2020-912), et non chaque année comme écrit en 0.2 ; date du dernier entretien à compléter ; **sel de l'adoucisseur à vérifier tous les 3 mois**, entre deux nettoyages ; tolérances validées (± 15 j pour la maison, ± 7 j par défaut) ; alerte de gel annoncé gardée pour l'étape 2 ; abonnement du calendrier gardé en étape 3. Sécurité : sans objet (contenu seulement).
- Version 0.2 (23/10/2026) : **réponses du propriétaire aux questions du chapitre 11**. Véhicules : la VW Eos d'Agnès (dernier contrôle technique noté au 15/05/2025, date exacte à confirmer, donc le prochain avant le 15/05/2027 ; chaînes à mettre dans le coffre avant le 1er novembre et à retirer en avril) et le Tiguan de Bruno (acheté en décembre 2023, premier contrôle technique en décembre 2027 ; deux jeux de roues, été et hiver). Maison : adoucisseur nettoyé le 03/10/2026, tous les 6 mois ; pergola neuve jamais graissée, premier graissage vers la mi-novembre 2026, puis chaque fin octobre ou début novembre ; ramonage vers septembre, avant le premier feu. Toutes les suggestions des tableaux 9.3 à 9.5 sont gardées. Nouvelles tâches : entretien du robot tondeuse en novembre, passage du paysagiste en novembre (à réserver 2 mois avant), hivernage de la piscine vers novembre (eau autour de 12 °C, avant les premières gelées). **Nouveau principe demandé par le propriétaire : dates souples et dates impératives** (4.2), avec une tolérance en jours ; ajout aussi de la **préparation à l'avance** (4.3), de la **condition de déclenchement** (4.4) et de la liste **« À compléter »** pour les tâches sans date connue (3.1). **Abonnement du calendrier sur iPhone et iPad confirmé** par le propriétaire (3.5). **Jeton Infomaniak réglé le 23/10/2026, guidé pas à pas** : vérifié que Caddy ne s'en servait plus (aucun bloc `dns infomaniak` actif depuis le secours) ; seul jeton du compte (`caddy-psv-bmlab-dns01`, créé le 10/09/2026, dernière utilisation le 20/10) supprimé dans le Manager Infomaniak ; `/etc/systemd/system/caddy.service.d/override.conf` réécrit sans le jeton et avec `ExecStart` sans `--environ` ; Caddy redémarré, actif, psv, immat et la vitrine répondent en IPv4 et en IPv6. Le futur jeton ira dans un fichier lisible par root seulement (`EnvironmentFile`), pas dans le fichier de service. Dépôt GitHub privé `pilotage` accepté. Sécurité : aucune nouvelle surface hors calendrier abonné (déjà prévu au chapitre 8 : adresse à jeton révocable, titre et date seulement). Les données ajoutées (noms d'usage des véhicules, prénoms du foyer) sont personnelles mais peu sensibles ; aucune immatriculation ni aucun numéro de document dans le dépôt. Jeton exposé supprimé, `--environ` retiré.
- Version 0.1 (23/10/2026) : **première proposition**, à la demande du propriétaire après l'incident Caddy du 23/10 (PSV, CDC v3.73) : « un planning de tout ce que je dois faire, avec les dates, les actions pas à pas, sous forme de calendrier, avec des rappels par mail dès qu'une échéance approche, le jour même, et en alerte si les dates sont dépassées ». Périmètre **global** décidé par le propriétaire : informatique (tous les projets, présents et à venir), mais aussi maison, voitures, appartement, administratif. Décisions déjà prises : surveillance externe des sites et du système de rappels (challenge 1) ; contrôles et actions automatiques **avec un compte rendu en clair** à chaque automatisme (challenge 2) ; tâches « en attente » avec date de relance (challenge 3) ; un seul e-mail par jour, trois priorités (challenge 4) ; e-mails au **même destinataire que le rapport de sauvegarde du PC**. Sécurité : nouvelle application privée sur le serveur commun ; voir chapitre 8.

---

## 1. Objet

Un seul endroit, au-dessus de tous les projets, qui recense **tout ce que le propriétaire doit faire régulièrement ou attend**, lui rappelle à temps et lui dit pas à pas comment le faire.

Il remplace la mémoire du propriétaire (« je vais forcément en oublier ») et les listes éparpillées dans les cahiers des charges des projets (revue trimestrielle du CDC PSV chapitre 23, ménage Gmail, tests de restauration…).

Trois qualités attendues :
1. **Rien n'est oublié** : chaque tâche a une prochaine date ; une tâche en retard le reste visiblement jusqu'à ce qu'elle soit faite ou reportée volontairement.
2. **Rien n'est obscur** : chaque tâche explique quoi faire, étape par étape, avec les commandes à copier, des photos ou des vidéos.
3. **Rien ne dérange pour rien** : ce qui peut se vérifier ou se faire tout seul se fait tout seul, et le propriétaire en reçoit un compte rendu lisible, sans jargon.

## 2. Principes

- **Projet séparé**, comme Courses : dossier `C:\Dev\pilotage`, son propre dépôt, sa propre PocketBase (service `pocketbase-pilotage`, port 8095, données dans `/opt/pocketbase-pilotage`), son propre dossier web (`/var/www/pilotage-bmlab`), son propre bloc Caddy (`/etc/caddy/pilotage.caddy`). Il ne lit ni ne modifie jamais la base d'un autre projet.
- **Adresse** : `https://pilotage.bmlab.fr`, privée (connexion obligatoire).
- **Téléphone d'abord** (Safari iOS 15 et plus), lisible aussi sur PC.
- **Domaines** plutôt que projets, pour couvrir toute la vie courante. Domaines de départ (modifiables par le propriétaire) :
  - Informatique : Serveur, Puy-Saint-Vincent (site et vitrine), Immatriculation, Courses, PC et sauvegardes ; un sous-domaine par projet à venir.
  - Maison.
  - Voitures (une fiche par véhicule).
  - Appartement 405 (gestion, hors site web).
  - Administratif (assurances, papiers, abonnements, impôts).
- **Aucune fenêtre technique du navigateur** : fenêtres à la charte, bouton « ✕ Fermer » sur tout écran ouvert par-dessus.
- **Jamais de mot de passe ni de code dans une fiche** : la fiche dit *où* le trouver, jamais le secret lui-même (rappel affiché dans l'éditeur).

## 3. Ce que voit le propriétaire

### 3.1 Accueil (« Aujourd'hui »)
- En tête, trois compteurs : 🔴 **en retard**, 🟠 **cette semaine**, ⚪ **ce mois-ci**.
- La liste des tâches dans cet ordre, avec domaine, échéance (« dans 3 jours », « en retard de 5 jours ») et priorité.
- Le dernier compte rendu des contrôles automatiques (chapitre 5), résumé en une ligne : « Cette nuit : 14 contrôles, tout va bien » ou « Cette nuit : 1 point à regarder ».
- Filtre par domaine.
- **« À compléter »** : les tâches dont la date n'est pas encore connue (par exemple l'échéance d'une assurance) sont chargées sans date et rangées dans cette liste. Elles n'envoient aucun rappel, mais le résumé du lundi les rappelle en une ligne (« 9 tâches attendent une date »), jusqu'à ce que le propriétaire les ait toutes datées.

### 3.2 Calendrier
- Vue mois (défaut) et vue liste sur 12 mois.
- Chaque jour montre des pastilles colorées par priorité ; un appui ouvre les tâches du jour.
- Les tâches faites restent visibles, cochées, à la date où elles ont été faites.

### 3.3 Fiche d'une tâche
- Titre, domaine, priorité, fréquence, prochaine échéance, dernière réalisation.
- **Procédure pas à pas** : étapes numérotées, chacune avec texte, et si besoin commande à copier (bouton « Copier »), photos, vidéo. Cases à cocher pendant qu'on avance (gardées si on quitte et revient).
- **Matériel ou produits nécessaires** (ex. « sel régénérant, 2 sacs de 25 kg »), lien d'achat facultatif.
- **Contacts utiles** (ex. ramoneur, garage), texte libre.
- **Historique** : chaque réalisation avec date, remarque, durée, coût facultatif, et **justificatifs** (certificat de ramonage, procès-verbal du contrôle technique, facture).
- Boutons :
  - **« Fait »** : demande la date (aujourd'hui par défaut), une remarque, des justificatifs facultatifs, puis calcule et affiche la prochaine échéance.
  - **« Reporter »** : nouvelle date et raison obligatoire (la raison reste dans l'historique ; un report n'efface jamais un retard en silence).
  - **« En attente de… »** : pour une tâche qui dépend de quelqu'un (voir 4.6).

### 3.4 Éditeur de procédure
Le propriétaire remplit lui-même ses procédures (adoucisseur, pergola…) depuis son téléphone :
- ajout d'étapes, réordonnées par glisser ;
- **photos** prises ou choisies sur le téléphone, réduites automatiquement (environ 300 Ko chacune) ;
- **vidéos courtes** filmées au téléphone (jusqu'à 2 minutes, environ 100 Mo, gardées dans la base) ; pour une vidéo plus longue, un lien (YouTube non répertorié, Google Drive) ;
- une procédure peut être dupliquée (ex. deux voitures).

Les procédures informatiques sont écrites par Claude, dans le même format, et tenues à jour quand une commande change.

### 3.5 Calendrier sur l'iPhone et l'iPad (souhait confirmé le 23/10/2026)
- Un bouton « S'abonner dans l'agenda » ouvre l'abonnement dans Calendrier d'iOS : une seule fois sur l'iPhone, une fois sur l'iPad. Ensuite, les tâches s'y ajoutent et s'y mettent à jour toutes seules ; l'agenda les relit quelques fois par jour.
- Chaque tâche y apparaît comme un événement d'une journée, à sa date (tâche souple : la date visée), avec sa pastille de priorité dans le titre (« 🔴 Contrôle technique Eos ») et un lien vers sa fiche. Les préparations (4.3) y figurent aussi.
- Une tâche faite ou reportée est mise à jour dans l'agenda au passage suivant. Le calendrier abonné est en lecture seule : on coche « Fait » dans le Pilotage, pas dans l'agenda.
- Les rappels restent assurés par l'e-mail de 7 h. iOS ignore souvent les alarmes des calendriers abonnés ; si le propriétaire veut une alerte sur le téléphone, il peut l'activer pour ce calendrier dans les réglages de Calendrier.
- Sécurité : voir chapitre 8 (adresse à jeton secret, révocable ; titre et date seulement).

## 4. Les tâches

### 3.6 Fiches de référence et onglet « Fiches » (validé le 28/10/2026)
- Une **fiche de référence** garde un savoir sans date : où sont les vannes d'eau, purger les radiateurs, réglages de la box. Elle a la même procédure pas à pas (photos, vidéos, commandes), le matériel, les contacts, les notes et l'historique qu'une tâche, mais **aucune échéance ni rappel** : elle n'apparaît ni dans l'accueil, ni dans le calendrier, ni dans « À compléter », ni dans les e-mails.
- Une fiche de référence peut devenir une tâche répétée (et l'inverse) en changeant son genre dans « Modifier la fiche ».
- L'onglet **« Fiches »** remplace l'onglet « Ajouter » : toutes les fiches, rangées par domaine, avec une recherche par mot (titre, notes, matériel, contacts, sans tenir compte des accents), un filtre par domaine et par genre, et les boutons « ＋ Tâche » et « ＋ Fiche de référence ».

### 4.1 Modes de répétition
| Mode | Exemple | Calcul de la prochaine date |
|---|---|---|
| **Après la dernière réalisation** | adoucisseur tous les 6 mois | date de réalisation + intervalle |
| **À date fixe du calendrier** | revue de sécurité en janvier, avril, juillet, octobre ; taxe de séjour en janvier | prochaine date de la liste, quelle que soit la date de réalisation |
| **Avant une date limite** | contrôle technique avant le 14/03/2028 ; pneus hiver posés avant le 1er novembre | date limite connue ; rappel calé dessus |
| **Une seule fois** | remplacer le jeton Infomaniak | disparaît une fois faite |

Chaque tâche peut avoir une **fenêtre de saison** (ex. ramonage entre septembre et octobre, avant la saison de chauffe).

### 4.2 Dates souples et dates impératives
Demande du propriétaire (version 0.2) : « on n'est pas à un jour ou une semaine près » pour graisser la pergola, mais un contrôle technique est **obligatoire** à sa date. Chaque tâche porte donc une **souplesse** :

| Souplesse | Exemples | Affichage | En retard à partir de |
|---|---|---|---|
| **Impérative** 🔒 | contrôle technique, chaînes ou pneus hiver avant le 1er novembre, assurance, impôts, nom de domaine | « avant le 15/05/2027 » | le lendemain de la date |
| **Souple, ± N jours** | pergola (± 15 j), adoucisseur (± 15 j), robot tondeuse (± 15 j) | « vers le 15/11 (± 15 j) » | date + N jours |

- Une tâche souple apparaît dans « à faire » dès *date − N jours*, sans insister. Elle ne passe « en retard » qu'après *date + N jours*.
- Une tâche impérative peut être reportée (bouton « Reporter »), mais **la date limite légale ou contractuelle reste affichée** en rouge à côté de la nouvelle date. Ainsi, un report ne cache jamais une obligation.
- Par défaut, toute tâche 🔴 liée à une obligation est impérative. Les autres sont souples, avec ± 7 jours. Le propriétaire peut changer ce réglage dans la fiche.

### 4.3 Préparation à l'avance
Certaines tâches demandent d'agir bien avant la date : réserver le paysagiste 2 mois avant son passage, prendre rendez-vous pour le contrôle technique ou le ramonage. Une tâche peut porter une **préparation** : un texte (« appeler le paysagiste pour fixer la date ») et un délai (60 jours). À *date − délai*, la préparation apparaît comme une tâche à part, rattachée à la tâche principale. Une fois cochée, elle disparaît.

### 4.4 Condition de déclenchement
Certaines tâches dépendent d'une observation plutôt que du calendrier : hiverner la piscine quand l'eau est autour de 12 °C, avant les premières gelées. La fiche porte alors une **condition** en clair, affichée en tête et dans l'e-mail, en plus de la fenêtre de saison (novembre). Idée pour l'étape 2, à confirmer : prévenir quand le gel est annoncé à la maison dans les 7 jours, avec Open-Meteo (déjà utilisé par le site PSV, sans compte) et seulement le nom de la commune.

### 4.5 Priorités et rappels
| Priorité | Pour | Premier rappel | Le jour J | En retard |
|---|---|---|---|---|
| 🔴 **Critique** | sécurité, panne, obligation légale | J-7 (J-30 si annuelle) | oui | **chaque jour**, en tête de l'e-mail |
| 🟠 **Important** | entretien, sauvegardes, conformité | J-7 (J-30 si annuelle) | oui | tous les 3 jours |
| ⚪ **Confort** | le reste | dans le résumé du lundi | dans le résumé du lundi | dans le résumé du lundi |

Pour une tâche souple, « le jour J » est le début de la tolérance (*date − N jours*) et « en retard » commence à *date + N jours* (4.2).

**Règles réglables** (validé le 28/10/2026) : les trois priorités restent fixes, mais leurs règles se règlent dans Réglages > Règles de rappel : rappel en retard tous les N jours (0 = résumé du lundi seulement), premier rappel et jour J dans l'e-mail du matin ou seulement le lundi, premier rappel par défaut (7 jours) et pour une tâche annuelle (30 jours), tolérance proposée pour une nouvelle tâche souple (7 jours). Le tableau ci-dessus donne les règles d'origine ; un bouton y revient.

### 4.6 Tâches « en attente »
Une tâche peut attendre une réponse ou un événement extérieur. Elle porte :
- **ce qu'on attend et de qui** (ex. « réponse du Département, demande 85-5448 ») ;
- **une date de relance** : à cette date, rappel « relancer ou décider » ;
- son historique (relances faites).

## 5. Contrôles et actions automatiques (étape 2)

Chaque nuit à 5 h, un script du serveur (`controles_nuit.sh`, lancé par systemd en tant que root, lecture seule sauf les actions listées en 5.2) vérifie tout ce qui peut l'être et envoie ses résultats au Pilotage.

### 5.1 Contrôles
| Contrôle | Alerte si |
|---|---|
| Sites en ligne : psv, vitrine, immat, courses, pilotage, jardin, pièces euro | un site ne répond pas |
| Certificats HTTPS de chaque site | moins de 20 jours avant la fin |
| Sauvegarde du jour de chaque projet (sur le serveur et sur le Shadow Drive) | plus de 2 jours sans sauvegarde, ou taille anormale (moitié de la veille) |
| Espace disque du serveur | moins de 20 % libre |
| Mises à jour du système en attente | une mise à jour de sécurité attend depuis plus de 3 jours |
| Redémarrage demandé par le système (nouveau noyau) | depuis plus de 7 jours |
| Nouvelle version de PocketBase ou de Caddy | si elle corrige une faille : tâche 🔴 créée ; sinon notée pour la revue trimestrielle |
| Services du serveur (Caddy, chaque PocketBase) | un service arrêté ou redémarré plusieurs fois dans la nuit |
| Robots de nuit lancés par un minuteur (Pièces euro, 1 h 30) | minuteur arrêté, dernier passage en erreur ou vieux de plus de 2 jours |
| Rapport de sauvegarde du PC (étape 3) | pas de rapport depuis 2 jours |

### 5.2 Actions faites toutes seules
Seulement des actions sans risque de casser un site :
- **mises à jour de sécurité du système** (Debian `unattended-upgrades`, sources de sécurité seulement ; Caddy et les PocketBase exclus : Caddy est bloqué par `apt-mark hold`, les PocketBase ne viennent pas d'apt) ;
- **nettoyage** des vieux paquets et journaux au-delà de 14 jours.

Aucune montée de version de PocketBase ni de Caddy n'est automatique : l'incident du 23/10 montre qu'une mise à jour peut couper les sites. Elles restent des tâches guidées, faites en présence du propriétaire.

### 5.3 Comptes rendus en clair
Chaque automatisme écrit un compte rendu **compréhensible sans connaissance technique** : ce qui a été vérifié, ce qui a été fait, ce que ça veut dire, et s'il y a quelque chose à faire. Exemples :

> ✅ **Certificats** : les 5 sites ont un certificat valide. Le plus proche de sa fin est celui de psv.bmlab.fr (9 décembre, dans 47 jours) ; il sera renouvelé tout seul vers le 9 novembre. Rien à faire.

> ✅ **Mises à jour de sécurité** : 2 corrections installées cette nuit (bibliothèque de lecture XML, outil de compression). Aucun site n'a été interrompu. Rien à faire.

> 🔴 **Sauvegarde Courses** : la dernière copie sur le Shadow Drive date du 20/10, il y a 3 jours. Les sauvegardes de PSV sont, elles, à jour, donc le Shadow Drive répond. Cause probable : la tâche de copie de Courses. Une tâche « Réparer la sauvegarde Courses » a été créée, avec la marche à suivre.

Les comptes rendus sont gardés 90 jours, consultables dans l'application (écran « Contrôles »).

## 6. E-mails

- **Destinataire** : le même que le rapport de sauvegarde du PC (adresse saisie dans les réglages, jamais écrite dans le dépôt).
- **Expéditeur** : relais Infomaniak, comme les autres projets ; nom d'expéditeur « Pilotage » (pas le triptyque de l'appartement : outil général).
- **Un seul e-mail par jour au maximum, à 7 h**, envoyé seulement s'il y a quelque chose : un rappel dû, un retard, ou un contrôle en alerte. Objet explicite, ex. « 🔴 1 en retard · 🟠 2 cette semaine ».
- Contenu, dans l'ordre :
  1. **En retard** (🔴 chaque jour, 🟠 tous les 3 jours) ;
  2. **Aujourd'hui** ;
  3. **Bientôt** (premiers rappels) ;
  4. **Contrôles de la nuit** : une ligne si tout va bien, les comptes rendus détaillés sinon ;
  5. pour chaque tâche, un **bouton qui ouvre sa fiche** (lien sans donnée personnelle, après connexion).
- **Résumé du lundi** (envoyé même s'il n'y a rien d'urgent) : la semaine à venir, le mois, les tâches ⚪, les attentes et leurs dates de relance, les comptes rendus de la semaine en une ligne chacun.

## 7. Surveillance externe (le gardien du gardien)

Si le serveur tombe, le Pilotage tombe avec lui et ne peut plus prévenir. Deux services externes gratuits, comptes créés par le propriétaire :
- **UptimeRobot** (offre gratuite, 50 sondes, toutes les 5 minutes) : interroge chaque site et envoie un e-mail dès qu'il ne répond plus, puis quand il revient ;
- **Healthchecks.io** (offre gratuite, 20 contrôles) : le Pilotage lui envoie un signal « je suis vivant » après chaque envoi de 7 h et après les contrôles de 5 h ; si le signal manque, Healthchecks.io écrit au propriétaire.

Les adresses de ces services ne reçoivent aucune donnée personnelle : seulement les adresses publiques des sites et un signal vide.

## 8. Sécurité et données

- **Connexion** : compte PocketBase du propriétaire, mot de passe + code à usage unique par e-mail (double authentification, comme l'administration PSV) ; session de 30 jours sur le téléphone.
- **Console PocketBase** non exposée (tunnel SSH seulement), API superuser refusée par Caddy, comme Courses.
- **Script de contrôle** : il envoie ses résultats à une route dédiée, protégée par un secret long gardé dans `/etc/pilotage/secret` (lisible par root seulement), jamais dans le dépôt. Il ne peut qu'ajouter des comptes rendus, rien lire ni modifier d'autre.
- **Données** : personnelles mais peu sensibles (immatriculations, adresses d'artisans, factures) ; aucun secret (règle 2). Sauvegarde chiffrée chaque nuit sur le Shadow Drive dédié aux sauvegardes, dossier à part, comme Courses ; elle est elle-même contrôlée (5.1).
- **Vidéos** : place à surveiller (contrôle d'espace disque, 5.1) ; au-delà de 5 Go de médias, alerte et proposition de déplacer les vidéos vers un lien externe.
- **Calendrier abonné** (étape 3) : adresse avec un jeton secret, révocable ; le flux ne montre que titre et date, jamais la procédure ni les justificatifs.

## 9. Inventaire de départ

Échéances proposées à partir d'aujourd'hui (23/10/2026), à confirmer ou corriger par le propriétaire. 🤖 = vérifié ou fait automatiquement (étape 2), avec compte rendu.

### 9.1 Informatique
| Tâche | Fréquence | Prochaine | Priorité | Domaine |
|---|---|---|---|---|
| ~~Supprimer chez Infomaniak le jeton d'API exposé le 23/10~~ | une fois | **fait le 23/10/2026** | 🔴 | Serveur |
| Créer un nouveau jeton et le ranger sur le serveur (fichier `EnvironmentFile` lisible par root seulement) | une fois | avec le retour du module Infomaniak | 🔴 | Serveur |
| ~~Retirer `--environ` du service Caddy~~ | une fois | **fait le 23/10/2026** | 🔴 | Serveur |
| Remettre le module Infomaniak dans Caddy et les fichiers `.avant-secours` | en attente du service caddyserver.com, relance chaque 3 jours | 26/10 | 🟠 | Serveur |
| Mises à jour du système (hors sécurité, hors Caddy) | mensuelle, le 1er | 01/11 | 🟠 | Serveur |
| Mises à jour de sécurité | 🤖 chaque nuit | — | — | Serveur |
| Revue de sécurité trimestrielle (méthode du CDC PSV chapitre 23) | janv., avril, juil., oct. | 15/01/2027 | 🔴 | Tous |
| Montée de version : PocketBase (accueil, immat, courses, sandbox, pilotage), Caddy (`caddy upgrade`), bibliothèques | avec la revue | 15/01/2027 | 🔴 | Tous |
| Test de restauration d'une sauvegarde (PSV, Courses, Pilotage : à tour de rôle) | trimestrielle | 15/12/2026 | 🟠 | Tous |
| Test de restauration de la sauvegarde du PC | trimestrielle | 15/12/2026 | 🟠 | PC |
| Renouvellement des secrets : jeton Infomaniak, clé Turnstile, mot de passe du relais e-mail, mots de passe d'administration | annuelle | 23/10/2027 | 🟠 | Tous |
| Renouvellement du nom de domaine bmlab.fr (fin le 10/09/2027, donnée par le propriétaire le 23/10/2026) | annuelle, avant le 10 septembre | 10/09/2027 (premier rappel J-30, le 11/08/2027) | 🔴 | Tous |
| Certificats, sauvegardes, disque, services, versions | 🤖 chaque nuit | — | — | Tous |
| Décider du sort d'Immatriculation côté sauvegarde (aucune sauvegarde serveur ; seuls les réglages du joueur y sont) | une fois | 15/11 | ⚪ | Immat |
| Refonte de la sauvegarde du PC (proposition restic de l'audit du 14/10) | en attente de décision | 15/11 | 🟠 | PC |
| Test de charge du site PSV (plan S20) | une fois | 15/12 | ⚪ | PSV |

### 9.2 Puy-Saint-Vincent (site et conformité)
| Tâche | Fréquence | Prochaine | Priorité |
|---|---|---|---|
| Ménage RGPD dans Gmail (messages des locataires au-delà des durées de la politique) | trimestrielle | 15/01/2027 | 🟠 |
| Relecture de la politique de confidentialité et du registre RGPD | annuelle | 08/10/2027 | 🟠 |
| Validation des textes RGPD par le juriste | en attente du juriste | relance 15/11 | 🟠 |
| Autorisation Inforoute (demande 85-5448 du 02/10) | en attente du Département | relance 02/11 | ⚪ |
| Tarif de la taxe de séjour de l'année | annuelle, janvier | 15/01/2027 | 🟠 |
| Vérifier tous les tarifs et informations datées du site PSV avant l'hiver (activités, commerces, services, remontées, horaires) | annuelle, mi-novembre | 15/11/2026 | 🟠 |
| Vérifier tous les tarifs et informations datées du site PSV avant l'été | annuelle, mi-mai | 15/05/2027 | 🟠 |
| Vérifier les liens de psv.bmlab.fr, surtout les liens externes (complète la détection des liens cassés au clic) | trimestrielle | 15/01/2027 | 🟠 |
| Étape 5 de Courses (abandon du classeur Excel) | en attente | 15/12 | ⚪ |

### 9.3 Maison (réponses du 23/10/2026 ; toutes les suggestions sont gardées)
| Tâche | Fréquence | Prochaine | Souplesse | Priorité |
|---|---|---|---|---|
| Nettoyer l'adoucisseur d'eau (dernier : 03/10/2026) | 6 mois après le dernier | vers le 03/04/2027 | ± 15 j | 🟠 |
| Graisser les lames de la pergola bioclimatique (neuve, jamais graissée) | chaque année, fin octobre ou début novembre | vers le 15/11/2026, puis vers le 01/11 | ± 15 j | 🟠 |
| Ramonage de la cheminée (garder le certificat : demandé par l'assurance) | chaque année, vers septembre, avant le premier feu (souvent en novembre) | 2026 pas encore fait : avant le premier feu, vers le 15/11/2026 (**réserver le ramoneur tout de suite**) ; ensuite vers le 15/09 | ± 15 j ; préparation : réserver le ramoneur 30 j avant | 🔴 obligation |
| Vérifier et recharger le sel de l'adoucisseur | tous les 3 mois (une fois entre deux nettoyages, et au nettoyage) | vers le 03/01/2027 | ± 15 j | ⚪ |
| Entretien de la pompe à chaleur (obligatoire tous les 2 ans, attestation à garder) | tous les 2 ans après le dernier | à compléter (date de la dernière attestation du chauffagiste) | 🔒 impérative ; préparation : prendre rendez-vous 30 j avant | 🔴 obligation |
| Tester les détecteurs de fumée, changer les piles | 6 mois | vers le 01/12/2026 | ± 15 j | 🟠 |
| Nettoyer les bouches et filtres de la VMC | 6 mois | vers le 01/12/2026 | ± 15 j | ⚪ |
| Nettoyer les gouttières (après la chute des feuilles) | chaque automne | vers le 30/11/2026 | ± 15 j | ⚪ |
| Apporter le robot tondeuse à l'entretien (après la dernière tonte) | chaque année, novembre | vers le 15/11/2026 | ± 15 j | ⚪ |
| Passage du paysagiste | chaque année, novembre | vers le 15/11/2026 ; **2026 : pas encore réservé, appeler tout de suite** | ± 15 j ; préparation : appeler le paysagiste 60 j avant | 🟠 |
| Hiverner la piscine | chaque année, vers novembre | vers le 15/11/2026 (2026 pas encore fait : surveiller la température de l'eau dès maintenant) | condition : eau autour de 12 °C, avant les premières gelées (4.4) | 🟠 |

### 9.4 Voitures (réponses du 23/10/2026 ; toutes les suggestions sont gardées)
**VW Eos d'Agnès**

| Tâche | Fréquence | Prochaine | Souplesse | Priorité |
|---|---|---|---|---|
| Contrôle technique (dernier noté au 15/05/2025, date exacte à confirmer sur le procès-verbal) | tous les 2 ans | avant le 15/05/2027 | 🔒 impérative ; préparation : prendre rendez-vous 30 j avant | 🔴 obligation |
| Mettre les chaînes dans le coffre (loi Montagne) | chaque année | avant le 01/11 (2026 : **pas encore fait, dans 9 jours**) | 🔒 impérative | 🔴 |
| Retirer les chaînes du coffre (fin de l'obligation le 31 mars) | chaque année, avril | vers le 15/04/2027 | ± 15 j | ⚪ |
| Entretien constructeur (vidange…) | selon le carnet | à compléter | ± 30 j | 🟠 |
| Échéance de l'assurance | annuelle | à compléter | 🔒 impérative | 🟠 |

**VW Tiguan de Bruno** (acheté en décembre 2023)

| Tâche | Fréquence | Prochaine | Souplesse | Priorité |
|---|---|---|---|---|
| Premier contrôle technique (4 ans après la première mise en circulation, date exacte en case B de la carte grise) | puis tous les 2 ans | avant décembre 2027, jour à confirmer | 🔒 impérative ; préparation : prendre rendez-vous 30 j avant | 🔴 obligation |
| Poser les roues hiver (loi Montagne) | chaque année | avant le 01/11 (2026 : **pas encore fait, dans 9 jours : rendez-vous au garage tout de suite**) | 🔒 impérative ; préparation : rendez-vous au garage 21 j avant | 🔴 |
| Reposer les roues été (fin de l'obligation le 31 mars) | chaque année, avril | vers le 15/04/2027 | ± 15 j | ⚪ |
| Entretien constructeur (vidange…) | selon le carnet | à compléter | ± 30 j | 🟠 |
| Échéance de l'assurance | annuelle | à compléter | 🔒 impérative | 🟠 |

Les voitures sont désignées par un nom d'usage. L'immatriculation pourra être saisie dans l'application, mais elle n'apparaît jamais dans le dépôt.

### 9.5 Appartement 405 et administratif (toutes gardées le 23/10/2026 ; dates à compléter, liste « À compléter » du 3.1)
| Tâche | Fréquence | Priorité |
|---|---|---|
| Assurance propriétaire non occupant de l'appartement | annuelle | 🟠 |
| Assemblée générale de la copropriété (convocation, vote, procès-verbal) | annuelle | ⚪ |
| Contrat avec l'agence (échéance, renouvellement) | annuelle | 🟠 |
| Déclaration des revenus locatifs | annuelle, printemps | 🔴 |
| Assurance habitation de la maison | annuelle | 🟠 |
| Papiers d'identité (date de fin des cartes, passeports, permis) | avant la date de fin, rappel J-90 | 🟠 |
| Abonnements : Free, Shadow Drive, Infomaniak, autres (renouvellement, prix) | annuelle | ⚪ |

## 10. Étapes de construction

| Étape | Contenu | État |
|---|---|---|
| 1 | Base de données, connexion, accueil, calendrier, fiches, procédures avec photos et vidéos, « Fait » / « Reporter » / « En attente », justificatifs, dates souples ou impératives, préparations, liste « À compléter », e-mail de 7 h et résumé du lundi, inventaire du chapitre 9 chargé, sauvegarde | **construite** (1.0.0, 23/10/2026), à installer (`deploy/INSTALLATION.md`) |
| 2 | Contrôles et actions automatiques de la nuit avec comptes rendus en clair, surveillance externe (UptimeRobot, Healthchecks.io), alerte de gel annoncé | **installée** (29/10/2026) |
| 3 | Abonnement du calendrier dans l'agenda de l'iPhone et de l'iPad (3.5, souhait confirmé), rapport de la sauvegarde du PC transmis au Pilotage | **installée** (29/10/2026) |

## 11. Questions ouvertes

1. ~~Date de fin du nom de domaine bmlab.fr~~ : 10/09/2027 (réponse du 23/10/2026).
2. ~~Véhicules et dates de la maison~~ : réponses du 23/10/2026 (versions 0.2 et 0.3). Restent à saisir dans l'application (liste « À compléter ») : date exacte du dernier contrôle technique de l'Eos, date de première mise en circulation du Tiguan, date du dernier entretien de la pompe à chaleur, dates des assurances, de l'entretien constructeur, des papiers et des abonnements.
3. ~~Suggestions des tableaux 9.3 à 9.5~~ : toutes gardées (23/10/2026).
4. Comptes UptimeRobot et Healthchecks.io : à créer par le propriétaire au moment de l'étape 2.
5. ~~Alerte de gel annoncé~~ : gardée pour l'étape 2 (23/10/2026) ; commune saisie dans les réglages, jamais dans le dépôt.
6. ~~Tolérances~~ : validées (23/10/2026).
7. ~~Abonnement du calendrier~~ : reste en étape 3 (23/10/2026).

## 12. État réel (application 1.0.0, 23/10/2026)

**Fichiers**
- `public/` : les pages, servies telles quelles. `index.html`, `style.css`, `api.js` (appels à PocketBase, connexion en deux temps, envoi des fichiers avec avancement), `dialogue.js` (fenêtres à la charte), `echeances.js` (tous les calculs de dates), `outils.js`, `app.js` (connexion, navigation, accueil, calendrier), `fiche.js`, `editeur.js` (tâche et procédure), `reglages.js`.
- `deploy/` : `pocketbase-pilotage.service`, `pilotage.caddy`, `sauvegarde_pilotage.sh`, `pb_migrations/`, `pb_hooks/` (`pilotage.pb.js`, `pilotage.js` ; `echeances.js` y est copié depuis `public/` au déploiement), `INSTALLATION.md`.

**Données** (PocketBase, port 8095) : `domaines` (nom, pictogramme, parent, ordre) ; `taches` (titre, domaine, priorité, mode, intervalle et unité ou dates fixes, échéance, date limite, souplesse et tolérance, premier rappel, préparation, condition, état, attente, dernière réalisation, rappel envoyé, matériel, contacts, notes) ; `etapes` (texte, commande, 20 photos, une vidéo, un lien) ; `historique` (fait, report, attente, relance, fin d'attente, préparation, note ; remarque, durée, coût, 10 justificatifs, ancienne et nouvelle échéance) ; `reglages` (destinataire des e-mails, adresse du site) ; `envois` (journal des e-mails, en lecture seule pour l'application).

**Règles de calcul** (`echeances.js`)
- Prochaine échéance après « Fait » : mode « après » = date de réalisation + intervalle ; mode « à dates fixes » = première date de la liste après la fin de la fenêtre en cours (une pergola visée le 01/11 et graissée le 25/10 repart au 01/11 de l'année suivante) ; mode « une seule fois » = tâche terminée.
- Rangement de l'accueil : en retard (après date + tolérance), cette semaine (début de la tolérance dans 7 jours ou moins), ce mois-ci (31 jours), en attente, plus tard, à compléter.
- E-mail : retard 🔴 chaque jour, 🟠 au 1er jour puis tous les 3 jours ; jour J ; premier rappel J-7, J-30 pour une tâche annuelle, ou le nombre de jours réglé dans la tâche, envoyé une seule fois par échéance (`rappel_envoye`) ; tâches ⚪ seulement le lundi.
- Heure de Paris calculée sans base de fuseaux (heure d'été du dernier dimanche de mars au dernier dimanche d'octobre).

**E-mail du matin** : tâche planifiée toutes les 15 minutes de 5 h à 6 h 45 UTC ; l'envoi part au premier passage où il est 7 h à Paris, une fois par jour ; un échec est retenté jusqu'à 6 fois ; chaque matin laisse une ligne dans `envois` (« rien à signaler » compris), affichée en bas de l'accueil et dans les réglages. Expéditeur : relais Infomaniak réglé dans la console, nom « Pilotage ».

**Reste à faire pour l'étape 1** : installation sur le serveur (`deploy/INSTALLATION.md`) ; procédures informatiques à écrire par Claude dans l'application (montée de version, test de restauration, revue de sécurité) ; premier e-mail du matin réel à vérifier.

**Application 1.1.0 (28/10/2026)** : onglet « Fiches » (`public/repertoire.js`), fiches de référence (mode `reference`, exclues de tous les calculs dans `echeances.js`), règles de rappel réglables (`reglages.regles`, lues par `E.regles()` qui complète et borne les valeurs ; utilisées par l'e-mail du matin et par l'éditeur). Migration `1810400000_references_regles.js`.
