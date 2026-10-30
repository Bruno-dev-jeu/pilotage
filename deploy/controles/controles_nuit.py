#!/usr/bin/env python3
# Contrôles de la nuit du Pilotage (CDC chapitre 5, étape 2, 29/10/2026).
# Emplacement sur le serveur : /usr/local/bin/controles_nuit.py, lancé chaque
# nuit à 5 h (heure de Paris) par pilotage-controles.timer, en tant que root.
#
# Vérifie ce qui peut l'être (sites, certificats, sauvegardes, robots, disque,
# mises à jour, redémarrage, services, versions), fait un petit ménage sans risque
# (journaux de plus de 14 jours, cache des paquets), puis envoie au Pilotage
# un compte rendu EN CLAIR pour chaque contrôle :
#   POST http://127.0.0.1:8095/api/pilotage/controles (jamais par Internet),
#   en-tête X-Pilotage-Secret = contenu de /etc/pilotage/secret.
# Ensuite, signal de vie Healthchecks.io si /etc/pilotage/healthchecks-controles
# contient une adresse (https://hc-ping.com/…).
#
# Lecture seule, sauf le ménage ci-dessus. Aucune montée de version de Caddy
# ni de PocketBase (incident du 23/10/2026) ; les mises à jour de sécurité du
# système sont faites par unattended-upgrades, dont on lit seulement le journal.
# Aucun secret ici. Bibliothèque standard de Python 3 seulement.
#
# Essai sans rien envoyer : sudo /usr/local/bin/controles_nuit.py --essai

import datetime
import glob
import json
import os
import re
import shutil
import socket
import ssl
import subprocess
import sys
import time
import urllib.request

try:
    from zoneinfo import ZoneInfo
    PARIS = ZoneInfo("Europe/Paris")
except Exception:  # pragma: no cover
    PARIS = None

# ---------- ce qui est surveillé (à tenir à jour avec les projets) ----------

SITES = [
    ("psv.bmlab.fr", "site de l'appartement"),
    ("hameau-ecrins-405.bmlab.fr", "vitrine"),
    ("immat.bmlab.fr", "jeu Immatriculation"),
    ("courses.bmlab.fr", "Courses"),
    ("pilotage.bmlab.fr", "Pilotage"),
    ("jardin.bmlab.fr", "Jardin"),
    ("pieces-euro.bmlab.fr", "Pièces euro"),
]

# clé, nom, dossier des sauvegardes PocketBase, état de la copie Shadow Drive
SAUVEGARDES = [
    ("psv", "PSV (site de l'appartement)", "/opt/pocketbase-accueil/pb_data/backups", "/var/lib/sauvegarde-psv-shadow/etat"),
    ("courses", "Courses", "/opt/pocketbase-courses/pb_data/backups", "/var/lib/sauvegarde-courses/etat"),
    ("pilotage", "Pilotage", "/opt/pocketbase-pilotage/pb_data/backups", "/var/lib/sauvegarde-pilotage/etat"),
    ("jardin", "Jardin", "/opt/pocketbase-jardin/pb_data/backups", "/var/lib/sauvegarde-jardin/etat"),
    ("pieces", "Pièces euro", "/opt/pocketbase-pieces/pb_data/backups", "/var/lib/sauvegarde-pieces/etat"),
]

# robots lancés par un minuteur systemd (service sans [Install], donc absent
# du contrôle « Services ») : nom du service, nom en clair, heure de passage
ROBOTS = [
    ("pieces-robot", "Robot de nuit de Pièces euro", "1 h 30"),
]

URL_PILOTAGE = "http://127.0.0.1:8095/api/pilotage/controles"
FICHIER_SECRET = "/etc/pilotage/secret"
FICHIER_PING = "/etc/pilotage/healthchecks-controles"
DOSSIER_ETAT = "/var/lib/pilotage-controles"
JOURNAL = "/var/log/pilotage-controles.log"
MEDIAS_PILOTAGE = "/opt/pocketbase-pilotage/pb_data/storage"

resultats = []
ESSAI = False  # mode essai : rien n'est envoyé ni retenu pour la nuit suivante


def ajouter(cle, titre, statut, texte):
    resultats.append({"cle": cle, "titre": titre, "statut": statut, "texte": texte})


def maintenant():
    return datetime.datetime.now(PARIS) if PARIS else datetime.datetime.now()


def quand(ts):
    """« cette nuit à 4 h 20 », « le 27/10 à 4 h 20 »."""
    d = datetime.datetime.fromtimestamp(ts, PARIS) if PARIS else datetime.datetime.fromtimestamp(ts)
    jour = "aujourd'hui" if d.date() == maintenant().date() else "le " + d.strftime("%d/%m")
    return "%s à %d h %02d" % (jour, d.hour, d.minute)


def taille(o):
    if o >= 1e9:
        return ("%.1f Go" % (o / 1e9)).replace(".", ",")
    if o >= 1e6:
        return "%d Mo" % round(o / 1e6)
    return "%d Ko" % max(1, round(o / 1e3))


def majuscule(t):
    return t[:1].upper() + t[1:]


def commande(args, delai=60):
    r = subprocess.run(args, capture_output=True, text=True, timeout=delai)
    return r.returncode, r.stdout, r.stderr


NOMS = {
    "sites_en_ligne": "Sites en ligne", "certificats": "Certificats HTTPS", "disque": "Espace disque",
    "medias_pilotage": "Photos et vidéos du Pilotage", "memoire": "Mémoire du serveur", "mises_a_jour": "Mises à jour", "redemarrage": "Redémarrage",
    "services": "Services du serveur", "versions": "Versions de Caddy et PocketBase", "menage": "Ménage de la nuit",
}


def controle(fonction):
    """Un contrôle qui plante ne bloque pas les autres : il est signalé."""
    try:
        fonction()
    except Exception as e:  # noqa: BLE001
        nom = NOMS.get(fonction.__name__, fonction.__name__.replace("_", " "))
        ajouter("erreur-" + fonction.__name__.replace("_", "-"), "Contrôle « %s »" % nom, "attention",
                "Ce contrôle n'a pas pu se faire cette nuit (%s). Les autres contrôles ont eu lieu. À signaler à Claude si cela se répète." % e)


# ---------- les contrôles ----------

def sites_en_ligne():
    ko = []
    for hote, nom in SITES:
        code, sortie, _ = commande(["curl", "-s", "-o", "/dev/null", "-w", "%{http_code}", "-m", "15",
                                    "--resolve", hote + ":443:127.0.0.1", "https://" + hote + "/"], 30)
        statut_http = sortie.strip()
        if not (statut_http.startswith("2") or statut_http.startswith("3")):
            ko.append("%s (%s) : %s" % (hote, nom, "pas de réponse" if statut_http in ("", "000") else "erreur " + statut_http))
    if ko:
        ajouter("sites", "Sites en ligne", "alerte",
                "Ne répond%s pas correctement : %s.\nLe serveur lui-même tourne (ce compte rendu en vient). Cause probable : le service du site ou Caddy. "
                "Une tâche de réparation a été créée." % ("" if len(ko) == 1 else "ent", " ; ".join(ko)))
    else:
        ajouter("sites", "Sites en ligne", "ok",
                "Les %d sites répondent : %s. Rien à faire." % (len(SITES), ", ".join(h for h, _ in SITES)))


def certificats():
    fins = []
    problemes = []
    contexte = ssl.create_default_context()
    for hote, _ in SITES:
        try:
            with socket.create_connection(("127.0.0.1", 443), timeout=10) as s:
                with contexte.wrap_socket(s, server_hostname=hote) as t:
                    cert = t.getpeercert()
            fin = ssl.cert_time_to_seconds(cert["notAfter"])
            jours = int((fin - time.time()) // 86400)
            fins.append((jours, hote, fin))
            if jours < 20:
                problemes.append("%s se termine dans %d jours (il aurait dû être renouvelé vers 30 jours)" % (hote, jours))
        except Exception as e:  # noqa: BLE001
            problemes.append("%s : certificat illisible ou refusé (%s)" % (hote, e))
    if problemes:
        ajouter("certificats", "Certificats HTTPS", "alerte",
                "Problème : %s.\nSans certificat valide, les navigateurs affichent une page d'erreur. Caddy renouvelle par le port 443 : "
                "vérifier qu'il tourne et que le port 443 est ouvert. Une tâche de réparation a été créée." % " ; ".join(problemes))
        return
    fins.sort()
    jours, hote, fin = fins[0]
    date_fin = datetime.datetime.fromtimestamp(fin).strftime("%d/%m/%Y")
    ajouter("certificats", "Certificats HTTPS", "ok",
            "Les %d sites ont un certificat valide. Le plus proche de sa fin est celui de %s (%s, dans %d jours) ; "
            "il sera renouvelé tout seul environ 30 jours avant. Rien à faire." % (len(fins), hote, date_fin, jours))


def sauvegarde(cle, nom, dossier, fichier_etat):
    def verifier():
        alertes = []
        details = []
        zips = sorted(glob.glob(os.path.join(dossier, "*.zip")), key=os.path.getmtime)
        if not zips:
            alertes.append("aucune sauvegarde dans %s" % dossier)
        else:
            dernier = zips[-1]
            age_h = (time.time() - os.path.getmtime(dernier)) / 3600
            t = os.path.getsize(dernier)
            details.append("dernière sauvegarde %s (%s)" % (quand(os.path.getmtime(dernier)), taille(t)))
            if age_h > 48:
                alertes.append("la dernière sauvegarde a %d jours" % (age_h // 24))
            if len(zips) >= 2 and t < os.path.getsize(zips[-2]) / 2:
                alertes.append("elle fait moins de la moitié de la précédente (%s contre %s)" % (taille(t), taille(os.path.getsize(zips[-2]))))
        try:
            with open(fichier_etat, encoding="utf-8") as f:
                morceaux = f.read().strip().split(" ", 2)
            etat, ts = morceaux[0], int(morceaux[1])
            message = morceaux[2] if len(morceaux) > 2 else ""
            if etat != "OK":
                alertes.append("la copie chiffrée sur Shadow Drive a échoué %s (%s)" % (quand(ts), message))
            elif time.time() - ts > 48 * 3600:
                alertes.append("la copie chiffrée sur Shadow Drive date de %s" % quand(ts))
            else:
                details.append("copie chiffrée sur Shadow Drive faite %s (%s)" % (quand(ts), message))
        except FileNotFoundError:
            alertes.append("la copie chiffrée sur Shadow Drive n'a jamais tourné (%s absent)" % fichier_etat)
        if alertes:
            ajouter("sauvegarde-" + cle, "Sauvegarde de " + nom, "alerte",
                    "Problème : %s.%s\nUne tâche de réparation a été créée, avec ce compte rendu." % (" ; ".join(alertes), ("\nLe reste va bien : " + " ; ".join(details) + ".") if details else ""))
        else:
            ajouter("sauvegarde-" + cle, "Sauvegarde de " + nom, "ok", "%s. Rien à faire." % majuscule(" ; ".join(details)))
    verifier.__name__ = "sauvegarde_" + cle
    return verifier


def immatriculation():
    ajouter("sauvegarde-immat", "Sauvegarde d'Immatriculation", "info",
            "Pas de sauvegarde du serveur pour ce jeu (seuls les réglages des joueurs y sont) : décision en attente, voir la tâche « Décider du sort d'Immatriculation côté sauvegarde ».")


def taille_dossier(chemin):
    total = 0
    for racine, _, fichiers in os.walk(chemin):
        for f in fichiers:
            try:
                total += os.path.getsize(os.path.join(racine, f))
            except OSError:
                pass
    return total


# Seuils de l'espace disque (validés le 30/10/2026, CDC 0.22) : le disque du
# serveur ne fait que 15 Go, un pourcentage ne parle pas assez.
DISQUE_ALERTE = 3e9       # 🔴 sous 3 Go libres
DISQUE_ATTENTION = 5e9    # 🟠 sous 5 Go libres
DISQUE_BAISSE = 1e9       # 🔴 si l'espace libre baisse de plus de 1 Go en un jour


def disque():
    u = shutil.disk_usage("/")
    etat = lire_etat()
    avant = etat.get("disque", {})
    projets = {}
    for d in sorted(glob.glob("/opt/pocketbase-*")):
        if os.path.isdir(os.path.join(d, "pb_data")):
            projets[os.path.basename(d).replace("pocketbase-", "", 1)] = taille_dossier(os.path.join(d, "pb_data"))

    def evolution(nom, o):
        a = avant.get("projets", {}).get(nom)
        if a is None or abs(o - a) < 1e6:
            return ""
        return " (%s%s depuis la nuit dernière)" % ("+" if o > a else "−", taille(abs(o - a)))

    detail = " ; ".join("%s : %s%s" % (nom, taille(o), evolution(nom, o)) for nom, o in sorted(projets.items(), key=lambda x: -x[1]))
    texte = "%s libres sur %s (%d %%). Place prise par projet (données, fichiers et sauvegardes gardées sur le serveur) : %s." % (
        taille(u.free), taille(u.total), u.free / u.total * 100, detail or "aucun projet trouvé")
    baisse = avant.get("libre", u.free) - u.free
    if u.free < DISQUE_ALERTE:
        ajouter("disque", "Espace disque du serveur", "alerte",
                texte + "\nMoins de 3 Go libres : si le disque se remplit, aucun site ne peut plus rien enregistrer et les sauvegardes échouent. "
                "À faire : supprimer le superflu, réduire le nombre de sauvegardes gardées, ou agrandir le disque. Une tâche de réparation a été créée.")
    elif baisse > DISQUE_BAISSE:
        ajouter("disque", "Espace disque du serveur", "alerte",
                texte + "\nL'espace libre a baissé de %s en un jour : envoi massif de fichiers, journal qui s'emballe ou sauvegarde anormale. "
                "Regarder quel projet a grossi (détail ci-dessus). Une tâche de réparation a été créée." % taille(baisse))
    elif u.free < DISQUE_ATTENTION:
        ajouter("disque", "Espace disque du serveur", "attention",
                texte + "\nMoins de 5 Go libres : la marge diminue. Penser à faire de la place ou à agrandir le disque (tâche « Agrandir le disque du serveur »).")
    else:
        ajouter("disque", "Espace disque du serveur", "ok", texte + " Rien à faire.")
    if not ESSAI:
        etat["disque"] = {"libre": u.free, "projets": projets}
        ecrire_etat(etat)


def memoire():
    infos = {}
    with open("/proc/meminfo", encoding="utf-8") as f:
        for ligne in f:
            morceaux = ligne.split()
            if len(morceaux) >= 2:
                infos[morceaux[0].rstrip(":")] = int(morceaux[1]) * 1024
    total, dispo = infos.get("MemTotal", 0), infos.get("MemAvailable", 0)
    swap_total, swap_libre = infos.get("SwapTotal", 0), infos.get("SwapFree", 0)
    swap_pris = swap_total - swap_libre
    texte = "%s disponibles sur %s ; réserve sur disque (swap) utilisée : %s sur %s." % (taille(dispo), taille(total), taille(swap_pris), taille(swap_total))
    if dispo < 150 * 1024 * 1024:
        ajouter("memoire", "Mémoire du serveur", "attention",
                texte + " Moins de 150 Mo disponibles : le serveur est à l'étroit, les sites peuvent ralentir. À regarder avec Claude (quel service consomme le plus).")
    elif swap_total and swap_pris > swap_total / 2:
        ajouter("memoire", "Mémoire du serveur", "attention",
                texte + " La réserve sur disque est plus qu'à moitié utilisée : la mémoire manque régulièrement. À regarder avec Claude.")
    else:
        ajouter("memoire", "Mémoire du serveur", "ok", texte + " Rien à faire.")


def medias_pilotage():
    total = 0
    for racine, _, fichiers in os.walk(MEDIAS_PILOTAGE):
        for f in fichiers:
            try:
                total += os.path.getsize(os.path.join(racine, f))
            except OSError:
                pass
    if total > 5e9:
        ajouter("medias", "Photos et vidéos du Pilotage", "attention",
                "Elles occupent %s (plus de 5 Go) et alourdissent les sauvegardes. Proposition : remplacer les plus grosses vidéos par un lien (YouTube non répertorié, Google Drive)." % taille(total))
    else:
        ajouter("medias", "Photos et vidéos du Pilotage", "ok", "Elles occupent %s. Rien à faire." % taille(total))


def mises_a_jour():
    # 1) ce que unattended-upgrades a installé dans les dernières 24 h
    installes = []
    journal = "/var/log/unattended-upgrades/unattended-upgrades.log"
    automatique = os.path.exists(journal)
    if automatique:
        limite = datetime.datetime.now() - datetime.timedelta(hours=24)
        with open(journal, encoding="utf-8", errors="replace") as f:
            for ligne in f:
                m = re.match(r"(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}).*Packages that will be upgraded: (.*)", ligne)
                if m and datetime.datetime.strptime(m.group(1), "%Y-%m-%d %H:%M:%S") >= limite:
                    installes += m.group(2).split()
    # 2) ce qui attend encore
    _, sortie, _ = commande(["apt-get", "-s", "-o", "Debug::NoLocking=1", "upgrade"], 180)
    securite, ordinaires = [], []
    for ligne in sortie.splitlines():
        if ligne.startswith("Inst "):
            paquet = ligne.split()[1]
            (securite if "security" in ligne.lower() else ordinaires).append(paquet)
    _, retenus, _ = commande(["apt-mark", "showhold"])
    caddy_bloque = "caddy" in retenus.split()

    if not automatique:
        ajouter("securite", "Mises à jour de sécurité", "attention",
                "Les mises à jour de sécurité automatiques ne sont pas encore en place (unattended-upgrades absent) : voir la notice d'installation de l'étape 2.")
    elif installes:
        ajouter("securite", "Mises à jour de sécurité", "ok",
                "%d correction%s de sécurité installée%s ces dernières 24 h (%s). Les sites ont été vérifiés ensuite (contrôle « Sites en ligne »). Rien à faire."
                % (len(installes), "s" if len(installes) > 1 else "", "s" if len(installes) > 1 else "", ", ".join(installes[:15])))
    else:
        ajouter("securite", "Mises à jour de sécurité", "ok", "Aucune correction de sécurité à installer ces dernières 24 h. Rien à faire.")
    if securite:
        ajouter("securite-attente", "Corrections de sécurité en attente", "attention",
                "%d correction%s de sécurité attend%s encore (%s). Normalement installées au prochain passage automatique ; si cela dure plus de 3 jours, le signaler à Claude."
                % (len(securite), "s" if len(securite) > 1 else "", "ent" if len(securite) > 1 else "", ", ".join(securite[:15])))
    if ordinaires:
        ajouter("mises-a-jour", "Mises à jour ordinaires", "info",
                "%d mise%s à jour ordinaire%s en attente (%s) : pour la tâche mensuelle « Mises à jour du système » du 1er."
                % (len(ordinaires), "s" if len(ordinaires) > 1 else "", "s" if len(ordinaires) > 1 else "", ", ".join(ordinaires[:15])))
    if caddy_bloque:
        ajouter("caddy-bloque", "Caddy protégé des mises à jour apt", "ok",
                "Caddy reste bloqué dans apt (apt-mark hold) : une mise à jour automatique ne peut pas lui retirer son module, comme le 23/10. Rien à faire.")
    else:
        ajouter("caddy-bloque", "Caddy protégé des mises à jour apt", "alerte",
                "Caddy n'est plus bloqué dans apt : une mise à jour pourrait le remplacer par une version standard et couper les sites, comme le 23/10/2026. "
                "Commande à passer : sudo apt-mark hold caddy. Une tâche de réparation a été créée.")


def redemarrage():
    fichier = "/var/run/reboot-required"
    if not os.path.exists(fichier):
        ajouter("redemarrage", "Redémarrage du serveur", "ok", "Aucun redémarrage demandé par le système. Rien à faire.")
        return
    jours = int((time.time() - os.path.getmtime(fichier)) // 86400)
    paquets = ""
    try:
        with open(fichier + ".pkgs", encoding="utf-8") as f:
            paquets = ", ".join(sorted(set(f.read().split())))
    except OSError:
        pass
    texte = "Le système demande un redémarrage depuis %d jour%s (%s), pour finir d'appliquer une mise à jour. Les sites seront coupés une à deux minutes." % (
        jours, "s" if jours > 1 else "", paquets or "nouveau noyau")
    if jours > 7:
        ajouter("redemarrage", "Redémarrage du serveur", "alerte", texte + " Plus de 7 jours : à faire, de préférence le soir. Une tâche de réparation a été créée.")
    else:
        ajouter("redemarrage", "Redémarrage du serveur", "info", texte + " À faire quand cela vous arrange, dans la semaine.")


def lire_etat():
    try:
        with open(os.path.join(DOSSIER_ETAT, "etat.json"), encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return {}


def ecrire_etat(etat):
    os.makedirs(DOSSIER_ETAT, exist_ok=True)
    with open(os.path.join(DOSSIER_ETAT, "etat.json"), "w", encoding="utf-8") as f:
        json.dump(etat, f)


def services():
    _, sortie, _ = commande(["systemctl", "list-unit-files", "--type=service", "--state=enabled", "--no-legend", "--plain"])
    noms = sorted(l.split()[0] for l in sortie.splitlines() if l.startswith("pocketbase") or l.startswith("caddy.service"))
    etat = lire_etat()
    avant = etat.get("redemarrages", {})
    apres = {}
    arretes, instables = [], []
    for nom in noms:
        _, actif, _ = commande(["systemctl", "show", "-p", "ActiveState", "--value", nom])
        _, n, _ = commande(["systemctl", "show", "-p", "NRestarts", "--value", nom])
        court = nom.replace(".service", "")
        apres[nom] = int(n.strip() or 0)
        if actif.strip() != "active":
            arretes.append(court)
        elif nom in avant and apres[nom] - avant[nom] >= 2:
            instables.append("%s (%d redémarrages)" % (court, apres[nom] - avant[nom]))
    etat["redemarrages"] = apres
    ecrire_etat(etat)
    if arretes:
        ajouter("services", "Services du serveur", "alerte",
                "Arrêté%s : %s. Le site correspondant ne fonctionne plus. Une tâche de réparation a été créée." % ("s" if len(arretes) > 1 else "", ", ".join(arretes)))
    elif instables:
        ajouter("services", "Services du serveur", "attention",
                "Tout tourne, mais redémarré plusieurs fois depuis la nuit dernière : %s. Signe d'un plantage répété : à regarder avec Claude." % ", ".join(instables))
    else:
        ajouter("services", "Services du serveur", "ok",
                "Les %d services tournent normalement (%s). Rien à faire." % (len(noms), ", ".join(n.replace(".service", "") for n in noms)))


def robot(service, nom, heure):
    def verifier():
        def valeur(unite, propriete):
            return commande(["systemctl", "show", "-p", propriete, "--value", unite])[1].strip()
        if valeur(service + ".timer", "ActiveState") != "active":
            ajouter(service, nom, "alerte",
                    "Son minuteur (%s.timer) ne tourne pas : le robot ne passe plus chaque nuit à %s. "
                    "Commande à passer : sudo systemctl enable --now %s.timer. Une tâche de réparation a été créée." % (service, heure, service))
            return
        fin = int(valeur(service + ".service", "ExecMainExitTimestampMonotonic") or 0)
        with open("/proc/uptime", encoding="utf-8") as f:
            depuis_demarrage = float(f.read().split()[0])
        if fin == 0:
            ajouter(service, nom, "info",
                    "Pas encore passé depuis le dernier démarrage du serveur (il y a %d h) : prochain passage à %s. Rien à faire." % (depuis_demarrage // 3600, heure))
            return
        passage = time.time() - (depuis_demarrage - fin / 1e6)
        code = valeur(service + ".service", "ExecMainStatus")
        if valeur(service + ".service", "Result") != "success" or code not in ("", "0"):
            ajouter(service, nom, "alerte",
                    "Son dernier passage (%s) s'est terminé en erreur (code %s). Détail : sudo journalctl -u %s -n 30 --no-pager. "
                    "Une tâche de réparation a été créée." % (quand(passage), code or "inconnu", service))
        elif time.time() - passage > 48 * 3600:
            ajouter(service, nom, "alerte",
                    "Dernier passage : %s, alors qu'il doit passer chaque nuit à %s. Une tâche de réparation a été créée." % (quand(passage), heure))
        else:
            ajouter(service, nom, "ok", "Passé %s sans erreur. Rien à faire." % quand(passage))
    verifier.__name__ = "robot_" + service.replace("-", "_")
    return verifier


def derniere_version(depot):
    req = urllib.request.Request("https://api.github.com/repos/%s/releases/latest" % depot,
                                 headers={"Accept": "application/vnd.github+json", "User-Agent": "pilotage-controles"})
    with urllib.request.urlopen(req, timeout=20) as r:
        d = json.load(r)
    return d.get("tag_name", "").lstrip("v"), d.get("body", "") or ""


def plus_recente(a, b):
    def n(v):
        return [int(x) for x in re.findall(r"\d+", v)[:3]]
    return n(a) > n(b)


def versions():
    installees = {}
    _, sortie, _ = commande(["caddy", "version"])
    m = re.search(r"v?(\d+\.\d+\.\d+)", sortie)
    if m:
        installees["Caddy"] = {m.group(1): ["Caddy"]}
    pb = {}
    for binaire in sorted(glob.glob("/opt/*/pocketbase")):
        _, s, _ = commande([binaire, "--version"])
        m = re.search(r"(\d+\.\d+\.\d+)", s)
        if m:
            pb.setdefault(m.group(1), []).append(binaire.split("/")[2])
    if pb:
        installees["PocketBase"] = pb
    depots = {"Caddy": "caddyserver/caddy", "PocketBase": "pocketbase/pocketbase"}
    for logiciel, parv in installees.items():
        derniere, notes = derniere_version(depots[logiciel])
        en_retard = sorted(v for v in parv if plus_recente(derniere, v))
        cle = "version-" + logiciel.lower()
        if not en_retard:
            ajouter(cle, "Version de " + logiciel, "ok", "%s est à jour (%s). Rien à faire." % (logiciel, derniere))
            continue
        qui = " ; ".join("%s : %s" % (v, ", ".join(parv[v])) for v in en_retard)
        if re.search(r"security|vulnerab|CVE-", notes, re.I):
            ajouter(cle, "Version de " + logiciel, "alerte",
                    "Nouvelle version %s disponible, et ses notes parlent d'une correction de sécurité. Installé : %s. "
                    "À installer avec Claude, en votre présence (jamais automatiquement : incident du 23/10). Une tâche a été créée." % (derniere, qui))
        else:
            ajouter(cle, "Version de " + logiciel, "info",
                    "Nouvelle version %s disponible (installé : %s), sans correction de sécurité annoncée : notée pour la revue trimestrielle. Rien à faire maintenant." % (derniere, qui))


def menage():
    _, _, err = commande(["journalctl", "--vacuum-time=14d"], 120)
    m = re.search(r"freed ([\d.]+[KMGT]?)", err, re.I)
    commande(["apt-get", "-q", "autoclean"], 120)
    libere = m.group(1) if m else "rien"
    ajouter("menage", "Ménage de la nuit", "ok",
            "Journaux du système de plus de 14 jours effacés (%s libéré) et paquets téléchargés devenus inutiles supprimés. Rien à faire." % libere)


# ---------- envoi ----------

def envoyer(nuit):
    with open(FICHIER_SECRET, encoding="utf-8") as f:
        secret = f.read().strip()
    corps = json.dumps({"nuit": nuit, "resultats": resultats}).encode("utf-8")
    req = urllib.request.Request(URL_PILOTAGE, data=corps, method="POST",
                                 headers={"Content-Type": "application/json", "X-Pilotage-Secret": secret})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def signal_de_vie(echec):
    try:
        with open(FICHIER_PING, encoding="utf-8") as f:
            url = f.read().strip()
    except OSError:
        return
    if url.startswith("https://"):
        try:
            urllib.request.urlopen(url + ("/fail" if echec else ""), timeout=15).read()
        except Exception:  # noqa: BLE001
            pass


def main():
    global ESSAI
    essai = ESSAI = "--essai" in sys.argv
    nuit = maintenant().strftime("%Y-%m-%d")
    for c in [sites_en_ligne, certificats] + [sauvegarde(*s) for s in SAUVEGARDES] + [robot(*r) for r in ROBOTS] + [
            immatriculation, disque, memoire, medias_pilotage, mises_a_jour, redemarrage, services, versions]:
        controle(c)
    if not essai:
        controle(menage)
    if essai:
        print(json.dumps({"nuit": nuit, "resultats": resultats}, ensure_ascii=False, indent=1))
        return 0
    try:
        reponse = envoyer(nuit)
        ligne = "%s envoyé : %s" % (nuit, reponse)
        echec = False
    except Exception as e:  # noqa: BLE001
        ligne = "%s ÉCHEC de l'envoi au Pilotage : %s" % (nuit, e)
        echec = True
    with open(JOURNAL, "a", encoding="utf-8") as f:
        f.write(datetime.datetime.now().isoformat(timespec="seconds") + " " + ligne + "\n")
    signal_de_vie(echec)
    return 1 if echec else 0


if __name__ == "__main__":
    sys.exit(main())
