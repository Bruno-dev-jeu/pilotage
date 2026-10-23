/// <reference path="../pb_data/types.d.ts" />

// Comptes du Pilotage (CDC chapitre 8, 23/10/2026) :
//  - inscription publique fermée : seul le compte du propriétaire existe,
//    créé par le superuser dans la console (tunnel SSH) ;
//  - double authentification : après le mot de passe, un code à usage
//    unique est envoyé par e-mail (6 chiffres, valable 10 minutes ; la
//    seconde étape doit suivre le mot de passe dans les 30 minutes) ;
//  - session de 30 jours, prolongée à chaque ouverture de l'application.
// Prérequis : le relais e-mail est réglé dans la console (Settings > Mail
// settings) AVANT la première connexion, sinon le code ne peut pas partir.
// Retour en arrière (e-mails en panne, accès bloqué) : « migrate down ».
migrate((app) => {
  const users = app.findCollectionByNameOrId("users")
  users.createRule = null
  users.authToken.duration = 2592000
  users.otp.enabled = true
  users.otp.duration = 600
  users.otp.length = 6
  users.otp.emailTemplate.subject = "Pilotage : votre code de connexion"
  users.otp.emailTemplate.body = "<p>Bonjour,</p><p>Voici votre code de connexion au Pilotage : <strong>{OTP}</strong></p><p>Il est valable 10 minutes. Si vous n'êtes pas à l'origine de cette connexion, changez sans attendre le mot de passe du Pilotage.</p>"
  users.mfa.enabled = true
  users.mfa.duration = 1800
  app.save(users)
}, (app) => {
  const users = app.findCollectionByNameOrId("users")
  users.mfa.enabled = false
  users.otp.enabled = false
  app.save(users)
})
