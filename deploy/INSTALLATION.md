# Installation initiale du Pilotage sur le serveur bmlab

À faire une seule fois. Rien ici ne modifie PSV, Immatriculation ni Courses : nouvel utilisateur système, nouveau dossier, nouveau service, nouveau fichier Caddy appelé par une seule ligne.

Légende : « PC » = PowerShell sur le PC ; « Serveur » = une fois connecté par `ssh bmlab`.

## 1. DNS (Manager Infomaniak, zone bmlab.fr)

Créer `pilotage` avec les **mêmes valeurs** que `courses` : un enregistrement A (IPv4 fixe de la box) et un enregistrement AAAA (IPv6 de la VM). Pas de Dynamic DNS : l'IPv4 est fixe.

## 2. Envoyer les fichiers (PC)

```
cd C:\Dev\pilotage; scp deploy\pocketbase-pilotage.service deploy\pilotage.caddy deploy\sauvegarde_pilotage.sh deploy\pb_migrations\1810000000_comptes.js deploy\pb_migrations\1810100000_collections.js deploy\pb_migrations\1810200000_inventaire.js deploy\pb_migrations\1810300000_psv_liens_tarifs.js deploy\pb_migrations\1810400000_references_regles.js deploy\pb_hooks\pilotage.pb.js deploy\pb_hooks\pilotage.js public\echeances.js bmlab:/tmp/
```
```
cd C:\Dev\pilotage; scp public\index.html public\style.css public\robots.txt public\manifest.webmanifest public\api.js public\dialogue.js public\outils.js public\app.js public\fiche.js public\editeur.js public\reglages.js public\repertoire.js public\icones\icone.svg public\icones\icone-192.png public\icones\icone-512.png public\icones\apple-touch-icon.png bmlab:/tmp/
```

## 3. Sur le serveur

```
ssh bmlab
```

Vérifier que le port 8095 est libre (aucune ligne attendue) :
```
sudo ss -ltnp | grep 8095
```

Utilisateur système et dossiers :
```
sudo useradd --system --no-create-home --shell /usr/sbin/nologin pocketbase-pilotage
sudo mkdir -p /opt/pocketbase-pilotage/pb_data /opt/pocketbase-pilotage/pb_migrations /opt/pocketbase-pilotage/pb_hooks /var/www/pilotage-bmlab/icones
```

Exécutable PocketBase 0.40.5 (ARM64, même version que Courses), empreinte vérifiée sur la liste officielle (la ligne doit finir par « OK ») :
```
cd /tmp
wget https://github.com/pocketbase/pocketbase/releases/download/v0.40.5/pocketbase_0.40.5_linux_arm64.zip https://github.com/pocketbase/pocketbase/releases/download/v0.40.5/checksums.txt
sha256sum --ignore-missing -c checksums.txt
sudo unzip -o pocketbase_0.40.5_linux_arm64.zip pocketbase -d /opt/pocketbase-pilotage/
```

Migrations et règles du serveur (le fichier `echeances.js` va **aussi** dans les pages, plus bas) :
```
sudo mv /tmp/1810000000_comptes.js /tmp/1810100000_collections.js /tmp/1810200000_inventaire.js /tmp/1810300000_psv_liens_tarifs.js /tmp/1810400000_references_regles.js /opt/pocketbase-pilotage/pb_migrations/
sudo cp /tmp/echeances.js /opt/pocketbase-pilotage/pb_hooks/
sudo mv /tmp/pilotage.pb.js /tmp/pilotage.js /opt/pocketbase-pilotage/pb_hooks/
sudo chown -R pocketbase-pilotage:pocketbase-pilotage /opt/pocketbase-pilotage
```

Service :
```
sudo mv /tmp/pocketbase-pilotage.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now pocketbase-pilotage
sudo journalctl -u pocketbase-pilotage -n 20 --no-pager
```
Attendu : aucune erreur ; les migrations créent les collections et chargent l'inventaire (13 domaines, 47 tâches).

Pages :
```
sudo mv /tmp/icone.svg /tmp/icone-192.png /tmp/icone-512.png /tmp/apple-touch-icon.png /var/www/pilotage-bmlab/icones/
sudo mv /tmp/index.html /tmp/style.css /tmp/robots.txt /tmp/manifest.webmanifest /tmp/api.js /tmp/dialogue.js /tmp/echeances.js /tmp/outils.js /tmp/app.js /tmp/fiche.js /tmp/editeur.js /tmp/reglages.js /tmp/repertoire.js /var/www/pilotage-bmlab/
```

Caddy (sauvegarde, fichier à part, une ligne ajoutée, contrôle, rechargement) :
```
sudo cp /etc/caddy/Caddyfile /etc/caddy/Caddyfile.avant-pilotage
sudo mv /tmp/pilotage.caddy /etc/caddy/pilotage.caddy
printf '\nimport /etc/caddy/pilotage.caddy\n' | sudo tee -a /etc/caddy/Caddyfile
sudo caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
sudo systemctl reload caddy
```
Si `caddy validate` signale une erreur : ne pas recharger, remettre la sauvegarde (`sudo cp /etc/caddy/Caddyfile.avant-pilotage /etc/caddy/Caddyfile`) et transmettre le message à Claude. Le certificat de `pilotage.bmlab.fr` est obtenu tout seul par le port 443 dans la minute qui suit (pas de jeton Infomaniak).

## 4. Compte superuser (PC, par tunnel)

Dans une nouvelle fenêtre PowerShell, laisser tourner :
```
ssh -L 8095:127.0.0.1:8095 bmlab
```
Dans cette fenêtre (serveur), récupérer le lien de création :
```
sudo journalctl -u pocketbase-pilotage --no-pager | grep -o 'http://127.0.0.1:8095/_/#/pbinstall/[^ ]*' | tail -1
```
Si rien ne s'affiche, ou si le lien est refusé (jeton expiré) : `sudo systemctl restart pocketbase-pilotage`, puis relancer la commande. Copier le lien entier dans le navigateur du PC et créer le compte superuser (e-mail et mot de passe long, gardés dans le gestionnaire de mots de passe, jamais transmis à Claude).

## 5. Réglages dans la console (navigateur, tunnel ouvert, `http://127.0.0.1:8095/_/`)

Dans cet ordre, **avant** de créer le compte du propriétaire (la connexion demande un code envoyé par e-mail) :

1. **Settings > Application** : nom `Pilotage`, URL `https://pilotage.bmlab.fr`.
2. **Settings > Mail settings** : expéditeur `contact@bmlab.fr`, nom `Pilotage` ; cocher « Use SMTP mail server » : serveur `mail.infomaniak.com`, port `587`, identifiant `contact@bmlab.fr`, mot de passe du compte e-mail (gestionnaire de mots de passe). Enregistrer, puis bouton **Send test email** vers votre adresse : l'e-mail doit arriver.
3. **Settings > Backups** : sauvegarde automatique activée, expression `20 2 * * *`, **3** sauvegardes gardées (elles contiennent les photos et vidéos). Puis bouton de sauvegarde immédiate.
4. **Collections > users > New record** : votre compte (adresse e-mail, mot de passe long, « Verified » coché). C'est ce compte qui se connecte à l'application.

## 6. Première connexion (téléphone)

1. Ouvrir `https://pilotage.bmlab.fr`, saisir l'adresse et le mot de passe du compte créé en 5.4, puis le code reçu par e-mail.
2. **Réglages > E-mails de rappel** : saisir l'adresse qui reçoit le rapport de sauvegarde du PC, « Enregistrer l'adresse », puis « Envoyer un e-mail d'essai ».
3. Safari : bouton Partager, « Sur l'écran d'accueil ».

## 7. Sauvegarde hors site chiffrée

Même méthode que Courses (voir `C:\Dev\courses\deploy\INSTALLATION.md`, section 7), avec des noms propres au Pilotage :

Préparatif : sur le site de Shadow Drive, **connecté au compte dédié aux sauvegardes** (lecteur `P:`), Paramètres > Sécurité > créer un mot de passe d'application nommé `Serveur Pilotage sauvegardes`.

```
sudo rclone config --config /root/.config/rclone/pilotage.conf
```
1. `n`, nom `shadow-pilotage`, type `webdav`, url `https://drive.shadow.tech/remote.php/webdav`, vendor `nextcloud`, user = nom d'utilisateur du jeton (**attention** : chez Shadow Drive, chaque mot de passe d'application a **son propre nom d'utilisateur**, du type `bruno.milesi-1234`, affiché sous le jeton dans la liste : c'est lui qu'il faut saisir ici, jamais celui d'un autre jeton), password : `y` puis le mot de passe d'application (deux fois), bearer_token vide, options avancées `n`, `y`.
2. `n`, nom `pilotage-chiffre`, type `crypt`, remote `shadow-pilotage:SAV pilotage.bmlab.fr chiffre`, filename_encryption `off`, directory_name_encryption `false`, password : `y` puis une **nouvelle phrase secrète** (deux fois), password2 : `y` puis une **seconde phrase** (deux fois). Phrases différentes de celles de PSV et de Courses, notées dans le gestionnaire de mots de passe. Options avancées `n`, `y`.
3. `q`.

Script et tâche de nuit :
```
sudo mv /tmp/sauvegarde_pilotage.sh /usr/local/bin/
sudo chmod 755 /usr/local/bin/sauvegarde_pilotage.sh
(sudo crontab -l; echo '50 3 * * * /usr/local/bin/sauvegarde_pilotage.sh') | sudo crontab -
sudo crontab -l
sudo /usr/local/bin/sauvegarde_pilotage.sh
sudo cat /var/lib/sauvegarde-pilotage/etat
```
Attendu : `crontab -l` montre les lignes de PSV, de Courses **et** la nouvelle ; l'état commence par `OK`.

## 8. Vérifications

- `https://pilotage.bmlab.fr` affiche la page de connexion.
- `https://pilotage.bmlab.fr/_/` et `https://pilotage.bmlab.fr/api/collections/_superusers/records` répondent 404.
- `https://psv.bmlab.fr`, `https://immat.bmlab.fr` et `https://courses.bmlab.fr` répondent toujours normalement.

## Mise à jour de l'application (plus tard)

Pages : `scp` des fichiers de `public\` changés vers `/tmp/`, puis `sudo mv /tmp/… /var/www/pilotage-bmlab/`.
Si `echeances.js` change : le copier **aussi** dans `/opt/pocketbase-pilotage/pb_hooks/`, puis `sudo systemctl restart pocketbase-pilotage`.
Règles du serveur (`pb_hooks`) ou migrations : `sudo mv` dans le bon dossier, `sudo chown pocketbase-pilotage:pocketbase-pilotage …`, puis `sudo systemctl restart pocketbase-pilotage`.
