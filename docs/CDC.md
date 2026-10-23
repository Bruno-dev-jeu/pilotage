# Cahier des charges — Pilotage (échéances et entretien, tous domaines)

Version 0.3 — 23/10/2026 · **Validée par le propriétaire** (version 0.2 validée le 23/10/2026) ; étape 1 en cours

**Historique des versions**
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
| Sites en ligne : psv, vitrine, immat, courses, pilotage | un site ne répond pas |
| Certificats HTTPS de chaque site | moins de 20 jours avant la fin |
| Sauvegarde du jour de chaque projet (sur le serveur et sur le Shadow Drive) | plus de 2 jours sans sauvegarde, ou taille anormale (moitié de la veille) |
| Espace disque du serveur | moins de 20 % libre |
| Mises à jour du système en attente | une mise à jour de sécurité attend depuis plus de 3 jours |
| Redémarrage demandé par le système (nouveau noyau) | depuis plus de 7 jours |
| Nouvelle version de PocketBase ou de Caddy | si elle corrige une faille : tâche 🔴 créée ; sinon notée pour la revue trimestrielle |
| Services du serveur (Caddy, chaque PocketBase) | un service arrêté ou redémarré plusieurs fois dans la nuit |
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
| Informations datées de l'hiver (ouvertures, horaires, tarifs des fiches tourisme) | annuelle | 15/11/2026 | 🟠 |
| Informations datées de l'été | annuelle | 15/05/2027 | 🟠 |
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
| 1 | Base de données, connexion, accueil, calendrier, fiches, procédures avec photos et vidéos, « Fait » / « Reporter » / « En attente », justificatifs, dates souples ou impératives, préparations, liste « À compléter », e-mail de 7 h et résumé du lundi, inventaire du chapitre 9 chargé, sauvegarde | **en cours** (CDC 0.2 validé le 23/10/2026) |
| 2 | Contrôles et actions automatiques de la nuit avec comptes rendus en clair, surveillance externe (UptimeRobot, Healthchecks.io), alerte de gel annoncé | à faire |
| 3 | Abonnement du calendrier dans l'agenda de l'iPhone et de l'iPad (3.5, souhait confirmé), rapport de la sauvegarde du PC transmis au Pilotage | à faire (l'abonnement peut être avancé en étape 1 si le propriétaire le souhaite) |

## 11. Questions ouvertes

1. ~~Date de fin du nom de domaine bmlab.fr~~ : 10/09/2027 (réponse du 23/10/2026).
2. ~~Véhicules et dates de la maison~~ : réponses du 23/10/2026 (versions 0.2 et 0.3). Restent à saisir dans l'application (liste « À compléter ») : date exacte du dernier contrôle technique de l'Eos, date de première mise en circulation du Tiguan, date du dernier entretien de la pompe à chaleur, dates des assurances, de l'entretien constructeur, des papiers et des abonnements.
3. ~~Suggestions des tableaux 9.3 à 9.5~~ : toutes gardées (23/10/2026).
4. Comptes UptimeRobot et Healthchecks.io : à créer par le propriétaire au moment de l'étape 2.
5. ~~Alerte de gel annoncé~~ : gardée pour l'étape 2 (23/10/2026) ; commune saisie dans les réglages, jamais dans le dépôt.
6. ~~Tolérances~~ : validées (23/10/2026).
7. ~~Abonnement du calendrier~~ : reste en étape 3 (23/10/2026).
