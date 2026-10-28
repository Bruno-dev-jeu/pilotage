# Pilotage (échéances et entretien, tous domaines)

Application web privée prévue sur `https://pilotage.bmlab.fr` : tout ce que le propriétaire doit faire régulièrement ou attend, dans **tous les domaines** (informatique de tous les projets, maison, voitures, appartement 405, administratif), avec calendrier, procédures pas à pas (texte, commandes, photos, vidéos), rappels par e-mail et contrôles automatiques de la nuit avec comptes rendus en clair.

**Projet « chapeau », totalement séparé** des autres projets : site de l'appartement (`C:\Dev\site-accueil-appartement`, psv.bmlab.fr), jeu Immatriculation (`C:\Dev\immatriculation`), Courses (`C:\Dev\courses`). Son propre dépôt, sa propre PocketBase (service `pocketbase-pilotage`, port 8095, `/opt/pocketbase-pilotage`), son propre dossier web (`/var/www/pilotage-bmlab`), son propre bloc Caddy (`/etc/caddy/pilotage.caddy`). Il peut *lire* la documentation des autres projets pour en tirer les tâches, mais ne modifie jamais leurs fichiers ni leurs bases.

`docs/CDC.md` est la **source de vérité vivante** (historique des versions en tête, chapitre 12 « État réel »). État au 26/10/2026 : version 0.5 ; **étape 1 construite (application 1.0.0) et installée** sur le serveur (`deploy/INSTALLATION.md` ; sauvegarde Shadow Drive installée le 28/10/2026). Le tenir à jour dans le même travail que le code.

## Structure
- `public/` : l'application (HTML/CSS/JS sans framework ni build, servie telle quelle), comme Courses.
- `public/echeances.js` : **tous les calculs de dates**, utilisé par les pages *et* par le serveur : à chaque changement, l'envoyer aussi dans `/opt/pocketbase-pilotage/pb_hooks/` puis redémarrer `pocketbase-pilotage`. Essai rapide : `node` avec quelques `assert` (voir l'historique du CDC 0.4).
- `deploy/` : service systemd, bloc Caddy, sauvegarde, migrations (`pb_migrations/`), règles du serveur (`pb_hooks/` : `pilotage.pb.js` + `pilotage.js` ; rien de déclaré en haut d'un `.pb.js`, tout par `require()`).

## Conventions (communes aux projets du propriétaire)
- Parler au propriétaire **en français** (il n'est pas à l'aise en anglais). Textes et commentaires en français.
- **Jamais de secret** dans le code ni le CDC (mots de passe, jetons, adresse e-mail personnelle). Le destinataire des e-mails est le même que celui du rapport de sauvegarde du PC, saisi dans les réglages.
- Seule `contact@bmlab.fr` peut apparaître publiquement comme adresse du propriétaire.
- Pas de triptyque ni de plaque « Puy-Saint-Vincent / Hameau des Écrins / Appartement 405 » : outil général.
- **Fin de travail** : commiter et pousser sans demander, puis donner les commandes de déploiement en 3 temps : `cd C:\Dev\pilotage; scp … bmlab:/tmp/` (point-virgule, PowerShell 5.1), puis `ssh bmlab` seul, puis les `sudo mv /tmp/… …`. Ne jamais lancer soi-même `scp` ni `ssh`.
- Le propriétaire n'a pas d'éditeur utilisable sur le serveur (nano ne marche pas dans son terminal) : poser les fichiers par `scp` ou `printf … | sudo tee`.
- Serveur : Caddy enrichi du module `caddy-dns/infomaniak`, **bloqué dans apt** (`apt-mark hold caddy`) ; mise à jour par `sudo caddy upgrade` uniquement (incident du 23/10/2026, CDC PSV v3.73). Ne jamais demander la sortie de `journalctl -u caddy` sans prévenir qu'elle peut afficher le jeton Infomaniak.
- Cible : Safari iOS 15+ (pas de fonction déclarée dans un bloc `if`), téléphone d'abord.
- **Aucune fenêtre technique du navigateur** (jamais `alert`, `confirm`, `prompt`) ; bouton « ✕ Fermer » sur tout écran ouvert par-dessus.
- Chaque évolution du CDC porte une ligne « Sécurité : » (impact ou « sans objet »).
- Toute nouvelle colonne PocketBase reçoit un texte d'aide (rôle, format, exemple), 280 caractères au plus.
- Le propriétaire valide les propositions avant les gros changements.
