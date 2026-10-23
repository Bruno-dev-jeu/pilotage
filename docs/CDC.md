# Cahier des charges — Pilotage (échéances et entretien, tous domaines)

Version 0.1 — 23/10/2026 · Proposition soumise au propriétaire, rien n'est construit

**Historique des versions**
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
  - **« En attente de… »** : pour une tâche qui dépend de quelqu'un (voir 4.3).

### 3.4 Éditeur de procédure
Le propriétaire remplit lui-même ses procédures (adoucisseur, pergola…) depuis son téléphone :
- ajout d'étapes, réordonnées par glisser ;
- **photos** prises ou choisies sur le téléphone, réduites automatiquement (environ 300 Ko chacune) ;
- **vidéos courtes** filmées au téléphone (jusqu'à 2 minutes, environ 100 Mo, gardées dans la base) ; pour une vidéo plus longue, un lien (YouTube non répertorié, Google Drive) ;
- une procédure peut être dupliquée (ex. deux voitures).

Les procédures informatiques sont écrites par Claude, dans le même format, et tenues à jour quand une commande change.

## 4. Les tâches

### 4.1 Modes de répétition
| Mode | Exemple | Calcul de la prochaine date |
|---|---|---|
| **Après la dernière réalisation** | adoucisseur tous les 6 mois | date de réalisation + intervalle |
| **À date fixe du calendrier** | revue de sécurité en janvier, avril, juillet, octobre ; taxe de séjour en janvier | prochaine date de la liste, quelle que soit la date de réalisation |
| **Avant une date limite** | contrôle technique avant le 14/03/2028 ; pneus hiver posés avant le 1er novembre | date limite connue ; rappel calé dessus |
| **Une seule fois** | remplacer le jeton Infomaniak | disparaît une fois faite |

Chaque tâche peut avoir une **fenêtre de saison** (ex. ramonage entre septembre et octobre, avant la saison de chauffe).

### 4.2 Priorités et rappels
| Priorité | Pour | Premier rappel | Le jour J | En retard |
|---|---|---|---|---|
| 🔴 **Critique** | sécurité, panne, obligation légale | J-7 (J-30 si annuelle) | oui | **chaque jour**, en tête de l'e-mail |
| 🟠 **Important** | entretien, sauvegardes, conformité | J-7 (J-30 si annuelle) | oui | tous les 3 jours |
| ⚪ **Confort** | le reste | dans le résumé du lundi | dans le résumé du lundi | dans le résumé du lundi |

### 4.3 Tâches « en attente »
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
| Remplacer le jeton d'API Infomaniak (exposé le 23/10) | une fois | **en retard dès demain** | 🔴 | Serveur |
| Retirer `--environ` du service Caddy | une fois | avec le jeton | 🔴 | Serveur |
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

### 9.3 Maison (cités par le propriétaire, et suggestions à confirmer)
| Tâche | Fréquence | Priorité | Origine |
|---|---|---|---|
| Nettoyer l'adoucisseur d'eau | 6 mois après le dernier | 🟠 | propriétaire |
| Graisser les lames de la pergola bioclimatique | annuelle | 🟠 | propriétaire |
| Ramonage de la cheminée (garder le certificat : demandé par l'assurance) | annuelle, avant la saison de chauffe | 🔴 obligation | propriétaire |
| Recharger le sel de l'adoucisseur | à préciser | ⚪ | suggestion |
| Entretien de la chaudière ou de la pompe à chaleur (obligatoire chaque année) | annuelle | 🔴 | suggestion, si concerné |
| Tester les détecteurs de fumée, changer les piles | 6 mois | 🟠 | suggestion |
| Nettoyer les bouches et filtres de la VMC | 6 mois | ⚪ | suggestion |
| Nettoyer les gouttières | annuelle, automne | ⚪ | suggestion |

### 9.4 Voitures (une fiche par véhicule, à compléter)
| Tâche | Fréquence | Priorité | Origine |
|---|---|---|---|
| Contrôle technique | tous les 2 ans, date limite du dernier procès-verbal | 🔴 obligation | propriétaire |
| Pneus hiver ou chaînes (obligation loi Montagne en Isère et dans les Hautes-Alpes du 1er novembre au 31 mars) | pose avant le 1er novembre, dépose après le 31 mars | 🔴 | suggestion |
| Entretien constructeur (vidange…) | selon le carnet, km ou date | 🟠 | suggestion |
| Échéance de l'assurance | annuelle | 🟠 | suggestion |

### 9.5 Appartement 405 et administratif (suggestions à confirmer)
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
| 1 | Base de données, connexion, accueil, calendrier, fiches, procédures avec photos et vidéos, « Fait » / « Reporter » / « En attente », justificatifs, e-mail de 7 h et résumé du lundi, inventaire du chapitre 9 chargé, sauvegarde | à faire après validation |
| 2 | Contrôles et actions automatiques de la nuit avec comptes rendus en clair, surveillance externe (UptimeRobot, Healthchecks.io) | à faire |
| 3 | Abonnement du calendrier dans l'agenda du téléphone, rapport de la sauvegarde du PC transmis au Pilotage | à faire |

## 11. Questions ouvertes

1. ~~Date de fin du nom de domaine bmlab.fr~~ : 10/09/2027 (réponse du 23/10/2026).
2. Liste des véhicules (nom d'usage, date du dernier contrôle technique) et dates des dernières réalisations des tâches de la maison.
3. Suggestions des tableaux 9.3 à 9.5 : à garder, retirer ou compléter.
4. Comptes UptimeRobot et Healthchecks.io : à créer par le propriétaire au moment de l'étape 2.
