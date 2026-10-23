#!/bin/bash
# Copie hors site, chiffrée, des sauvegardes du Pilotage
# (23/10/2026). Emplacement sur le serveur : /usr/local/bin/sauvegarde_pilotage.sh,
# lancé chaque nuit par la crontab de root (50 3 * * *, heure UTC du serveur),
# une heure et demie après la sauvegarde automatique de la PocketBase du Pilotage
# (console > Settings > Backups : 20 2 * * * UTC, 3 sauvegardes gardées dans
# /opt/pocketbase-pilotage/pb_data/backups ; 3 et non 7 comme Courses, car
# chaque sauvegarde contient aussi les photos, vidéos et justificatifs).
#
# Totalement séparé des sauvegardes de PSV et de Courses : son
# propre fichier de configuration rclone (/root/.config/rclone/pilotage.conf),
# ses propres remotes, ses propres phrases secrètes, son propre journal.
#  - remote « pilotage-chiffre » (type crypt, deux phrases secrètes connues du
#    seul propriétaire, noms de fichiers lisibles + « .bin ») posé sur le
#    remote WebDAV « shadow-pilotage » : le compte Shadow Drive DÉDIÉ aux
#    sauvegardes (ouvert pour PSV, lecteur P: sur le PC), dossier à part
#    « SAV pilotage.bmlab.fr chiffre », mot de passe d'application propre
#    au Pilotage (« Serveur Pilotage sauvegardes »). Jamais le Shadow Drive
#    personnel du propriétaire (décision du 20/10/2026, reprise pour le Pilotage) ;
#  - copie les sauvegardes .zip qui n'y sont pas encore, n'efface jamais rien
#    sur le serveur ; sur Shadow Drive, supprime celles de plus de 30 jours ;
#  - écrit le résultat dans /var/lib/sauvegarde-pilotage/etat.
# Aucun secret ici : identifiants et phrases seulement dans pilotage.conf.
set -u
export RCLONE_CONFIG=/root/.config/rclone/pilotage.conf
SOURCE=/opt/pocketbase-pilotage/pb_data/backups
DESTINATION="pilotage-chiffre:"
JOURNAL=/var/log/sauvegarde-pilotage.log
ETAT=/var/lib/sauvegarde-pilotage/etat

mkdir -p "$(dirname "$ETAT")"
{
  echo "=== $(date -u '+%Y-%m-%d %H:%M:%S') UTC ==="
  # Une sauvegarde PocketBase de moins de 26 h doit exister.
  RECENTES=$(find "$SOURCE" -maxdepth 1 -name "*.zip" -mmin -1560 | wc -l)
  rclone copy "$SOURCE" "$DESTINATION" --include "*.zip" --log-level NOTICE
  CODE_COPIE=$?
  rclone delete "$DESTINATION" --include "*pb_backup_*.zip" --min-age 30d --log-level NOTICE
  CODE_MENAGE=$?
  NB_DISTANT=$(rclone lsf "$DESTINATION" --include "*.zip" 2>/dev/null | wc -l)
  echo "sauvegardes locales recentes=$RECENTES copie=$CODE_COPIE menage=$CODE_MENAGE sur Shadow Drive=$NB_DISTANT"
} >> "$JOURNAL" 2>&1

MAINTENANT=$(date -u +%s)
if [ "$CODE_COPIE" -ne 0 ]; then
  echo "ECHEC $MAINTENANT copie vers Shadow Drive impossible (code $CODE_COPIE), voir $JOURNAL" > "$ETAT"
elif [ "$RECENTES" -eq 0 ]; then
  echo "ECHEC $MAINTENANT aucune sauvegarde PocketBase de moins de 26 h dans $SOURCE" > "$ETAT"
else
  echo "OK $MAINTENANT $NB_DISTANT sauvegarde(s) sur Shadow Drive" > "$ETAT"
fi
