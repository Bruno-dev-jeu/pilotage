// Fonctions du Pilotage côté serveur, chargées par pilotage.pb.js
// (require). Le calcul des dates est celui de l'application
// (echeances.js, même fichier copié dans pb_hooks).

const E = require(`${__hooks}/echeances.js`)

const CHAMPS_TEXTE = ["titre", "priorite", "mode", "unite", "dates_fixes", "souplesse", "preparation", "condition", "etat", "attente_quoi", "materiel", "contacts", "notes", "domaine"]
const CHAMPS_DATE = ["echeance", "date_limite", "attente_relance", "derniere_realisation", "rappel_envoye"]
const CHAMPS_NOMBRE = ["intervalle", "tolerance", "rappel_jours", "preparation_jours"]

// Fiche PocketBase → objet simple attendu par echeances.js.
function versObjet(r) {
  const o = { id: r.id }
  CHAMPS_TEXTE.forEach((k) => { o[k] = r.getString(k) })
  CHAMPS_DATE.forEach((k) => { o[k] = E.jour(r.getString(k)) })
  CHAMPS_NOMBRE.forEach((k) => { o[k] = r.getInt(k) })
  o.preparation_faite = r.getBool("preparation_faite")
  o.alerte_gel = r.getBool("alerte_gel")
  return o
}

function dateBase(s) {
  return s ? s + " 00:00:00.000Z" : ""
}

// Avant l'enregistrement d'un événement : contrôles et valeurs calculées.
function avantHistorique(app, h) {
  const t = app.findRecordById("taches", h.getString("tache"))
  const o = versObjet(t)
  const type = h.getString("type")
  const date = E.jour(h.getString("date")) || E.aujourdhui()
  const nouvelle = E.jour(h.getString("nouvelle_echeance"))
  const remarque = h.getString("remarque").trim()
  h.set("date", dateBase(date))
  h.set("ancienne_echeance", dateBase(o.echeance))

  if (type === "report") {
    if (!nouvelle) throw new BadRequestError("Indiquez la nouvelle date.")
    if (!remarque) throw new BadRequestError("Indiquez la raison du report : elle reste dans l'historique.")
  } else if (type === "attente") {
    if (!remarque) throw new BadRequestError("Indiquez ce que vous attendez, et de qui.")
    if (!nouvelle) throw new BadRequestError("Indiquez la date de relance.")
  } else if (type === "relance") {
    if (!nouvelle) throw new BadRequestError("Indiquez la prochaine date de relance.")
  } else if (type === "fait") {
    if (date > E.aujourdhui()) throw new BadRequestError("La date de réalisation ne peut pas être dans le futur.")
    h.set("nouvelle_echeance", dateBase(E.prochaine(o, date)))
  }
}

// Après l'enregistrement : la tâche suit.
function apresHistorique(app, h) {
  const t = app.findRecordById("taches", h.getString("tache"))
  const o = versObjet(t)
  const type = h.getString("type")
  const date = E.jour(h.getString("date"))
  const nouvelle = E.jour(h.getString("nouvelle_echeance"))

  if (type === "fait") {
    if (!o.derniere_realisation || date >= o.derniere_realisation) t.set("derniere_realisation", dateBase(date))
    if (o.mode === "unique") {
      t.set("etat", "terminee")
    } else {
      t.set("echeance", dateBase(nouvelle))
      t.set("etat", "active")
    }
    t.set("date_limite", "")
    t.set("preparation_faite", false)
    t.set("rappel_envoye", "")
  } else if (type === "report") {
    // Tâche impérative : la date limite d'origine reste affichée.
    if (o.souplesse === "imperative" && !o.date_limite && o.echeance) t.set("date_limite", dateBase(o.echeance))
    t.set("echeance", dateBase(nouvelle))
    t.set("rappel_envoye", "")
  } else if (type === "attente") {
    t.set("etat", "attente")
    t.set("attente_quoi", h.getString("remarque").trim().slice(0, 300))
    t.set("attente_relance", dateBase(nouvelle))
  } else if (type === "relance") {
    t.set("attente_relance", dateBase(nouvelle))
  } else if (type === "fin_attente") {
    t.set("etat", "active")
    t.set("attente_relance", "")
  } else if (type === "preparation") {
    t.set("preparation_faite", true)
  } else {
    return
  }
  app.save(t)
}

// ---------- e-mail du matin ----------

function echapper(s) {
  return String(s === undefined || s === null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

const PASTILLE = { critique: "🔴", important: "🟠", confort: "⚪" }

function chargerTaches(app) {
  const domaines = {}
  app.findRecordsByFilter("domaines", "id != ''", "", 500, 0).forEach((d) => {
    domaines[d.id] = { nom: d.getString("nom"), emoji: d.getString("emoji") }
  })
  const res = []
  app.findRecordsByFilter("taches", "etat != 'terminee'", "", 2000, 0).forEach((r) => {
    const o = versObjet(r)
    const d = domaines[o.domaine]
    o.domaineNom = d ? (d.emoji ? d.emoji + " " : "") + d.nom : ""
    res.push(o)
  })
  return res
}

function reglages(app) {
  try {
    const r = app.findRecordsByFilter("reglages", "id != ''", "created", 1, 0)
    if (r.length) {
      let regles = null
      try {
        regles = JSON.parse(r[0].getString("regles") || "null")
      } catch (err) {
        regles = null
      }
      let meteo = null
      try {
        meteo = JSON.parse(r[0].getString("meteo") || "null")
      } catch (err) {
        meteo = null
      }
      return {
        id: r[0].id, email: r[0].getString("email_rappels"), site: r[0].getString("adresse_site") || "https://pilotage.bmlab.fr",
        regles: E.regles(regles), commune: r[0].getString("commune").trim(), meteo: meteo, ping: r[0].getString("ping_courriel"),
      }
    }
  } catch (err) {
    // pas encore de réglages
  }
  return { id: "", email: "", site: "https://pilotage.bmlab.fr", regles: E.regles(null), commune: "", meteo: null, ping: "" }
}

function ligne(el, auj, site) {
  const t = el.tache
  const prep = el.type === "preparation" ? "Préparation : " + t.preparation + " — pour « " + t.titre + " »" : t.titre
  const att = el.type === "attente" ? "<br><span style=\"color:#5f665f\">⏳ " + echapper(t.attente_quoi) + "</span>" : ""
  const cond = t.condition && el.type === "tache" ? "<br><span style=\"color:#5f665f\">👁 " + echapper(t.condition) + "</span>" : ""
  return "<tr><td style=\"padding:8px 0;border-top:1px solid #e3e3dc;vertical-align:top\">" +
    "<strong>" + PASTILLE[t.priorite] + " " + echapper(prep) + "</strong>" +
    (t.souplesse === "imperative" ? " 🔒" : "") +
    "<br><span style=\"color:#5f665f\">" + echapper(t.domaineNom) + " · " + echapper(E.libelle(el, auj)) + "</span>" + att + cond +
    "</td><td style=\"padding:8px 0 8px 12px;border-top:1px solid #e3e3dc;vertical-align:top;text-align:right\">" +
    "<a href=\"" + echapper(site) + "/#/tache/" + echapper(t.id) + "\" style=\"display:inline-block;padding:6px 12px;border-radius:8px;background:#2f5d8a;color:#fff;text-decoration:none;white-space:nowrap\">Ouvrir</a>" +
    "</td></tr>"
}

function section(titre, liste, auj, site) {
  if (!liste.length) return ""
  return "<h2 style=\"font-size:17px;margin:22px 0 4px\">" + echapper(titre) + "</h2>" +
    "<table style=\"width:100%;border-collapse:collapse\">" + liste.map((el) => ligne(el, auj, site)).join("") + "</table>"
}

function texteLigne(el, auj) {
  const t = el.tache
  const nom = el.type === "preparation" ? "Préparation : " + t.preparation + " (" + t.titre + ")" : t.titre
  return "- " + PASTILLE[t.priorite] + " " + nom + " — " + t.domaineNom + " — " + E.libelle(el, auj)
}

// ---------- contrôles de la nuit (CDC 5) ----------

const STATUT = { ok: "✅", info: "ℹ️", attention: "🟠", alerte: "🔴" }
const RANG_STATUT = { alerte: 0, attention: 1, info: 2, ok: 3 }

// Comptes rendus d'une nuit, les plus graves d'abord.
function controlesDe(app, nuit) {
  const liste = []
  app.findRecordsByFilter("controles", "nuit = {:n}", "", 200, 0, { n: nuit }).forEach((c) => {
    liste.push({ cle: c.getString("cle"), titre: c.getString("titre"), statut: c.getString("statut"), texte: c.getString("texte") })
  })
  liste.sort((a, b) => (RANG_STATUT[a.statut] - RANG_STATUT[b.statut]) || (a.titre < b.titre ? -1 : 1))
  return liste
}

function resumeControles(liste) {
  if (!liste.length) return "⚠️ Aucun compte rendu des contrôles cette nuit : le script de contrôle n'a pas tourné ou n'a pas pu écrire."
  const aRegarder = liste.filter((c) => c.statut === "alerte" || c.statut === "attention").length
  return aRegarder
    ? "Cette nuit : " + liste.length + " contrôles, " + aRegarder + " point" + (aRegarder > 1 ? "s" : "") + " à regarder."
    : "✅ Cette nuit : " + liste.length + " contrôles, tout va bien."
}

function texteHtml(t) {
  return echapper(t).split("\n").join("<br>")
}

// ---------- gel annoncé (CDC 4.4) ----------

function trouverCommune(app, r) {
  const m = r.commune.match(/\b(\d{5})\b/)
  const cp = m ? m[1] : ""
  const nom = r.commune.replace(/\b\d{5}\b/, "").trim()
  if (!nom) return null
  if (r.meteo && r.meteo.commune === r.commune && r.meteo.lat) return r.meteo
  const res = $http.send({
    url: "https://geocoding-api.open-meteo.com/v1/search?count=10&language=fr&format=json&countryCode=FR&name=" + encodeURIComponent(nom),
    method: "GET", timeout: 15,
  })
  const l = (res.statusCode === 200 && res.json && res.json.results) || []
  const choix = l.filter((x) => cp && x.postcodes && x.postcodes.indexOf(cp) >= 0)[0] || l[0]
  if (!choix) return null
  const meteo = { commune: r.commune, nom: choix.name, lat: choix.latitude, lon: choix.longitude }
  if (r.id) {
    const rec = app.findRecordById("reglages", r.id)
    rec.set("meteo", meteo)
    app.save(rec)
  }
  return meteo
}

const JOURS = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."]

// Gel annoncé dans les 7 jours, et tâches concernées encore à faire.
function gelAnnonce(app, r, taches, auj) {
  const concernees = taches.filter((t) => t.alerte_gel && t.etat !== "terminee" && t.mode !== "reference" &&
    (!t.echeance || E.ecart(auj, t.echeance) <= 60))
  if (!concernees.length || !r.commune) return null
  try {
    const lieu = trouverCommune(app, r)
    if (!lieu) return { erreur: "Commune « " + r.commune + " » introuvable pour l'alerte de gel : corrigez-la dans les réglages." }
    const res = $http.send({
      url: "https://api.open-meteo.com/v1/forecast?daily=temperature_2m_min&timezone=Europe%2FParis&forecast_days=7&latitude=" + lieu.lat + "&longitude=" + lieu.lon,
      method: "GET", timeout: 15,
    })
    const d = res.statusCode === 200 && res.json && res.json.daily
    if (!d) return null
    const jours = []
    for (let i = 0; i < d.time.length; i++) {
      if (d.temperature_2m_min[i] !== null && d.temperature_2m_min[i] <= 0) {
        const p = d.time[i].split("-")
        const js = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])).getUTCDay()
        jours.push(JOURS[js] + " " + E.format(d.time[i], true) + " (" + String(d.temperature_2m_min[i]).replace(".", ",") + " °C)")
      }
    }
    if (!jours.length) return null
    return { lieu: lieu.nom, jours: jours, taches: concernees }
  } catch (err) {
    app.logger().error("Prévisions de gel indisponibles", "error", err)
    return null
  }
}

// Signal de vie Healthchecks.io après l'e-mail du matin (CDC 7).
function signalDeVie(app, url) {
  if (!url || url.indexOf("https://") !== 0) return
  try {
    $http.send({ url: url, method: "GET", timeout: 10 })
  } catch (err) {
    app.logger().error("Signal de vie Healthchecks.io impossible", "error", err)
  }
}

// Construit l'e-mail. Rend { rien } s'il n'y a rien à envoyer (sauf lundi et essai).
function composer(app, auj, lundi, essai) {
  const r = reglages(app)
  const taches = chargerTaches(app)
  const sel = E.courriel(taches, auj, lundi || essai, r.regles)
  const tb = E.tableau(taches, auj)
  const nuit = controlesDe(app, auj)
  const aRegarder = nuit.filter((c) => c.statut === "alerte" || c.statut === "attention")
  const gel = gelAnnonce(app, r, taches, auj)
  const rien = !sel.retard.length && !sel.aujourdhui.length && !sel.bientot.length && !aRegarder.length && nuit.length && !gel
  if (rien && !lundi && !essai) return { rien: true, reglages: r, resume: resumeControles(nuit) }

  const c = tb.compteurs
  let objet = (c.retard ? "🔴 " + c.retard + " en retard" : "✅ rien en retard") + " · 🟠 " + c.semaine + " cette semaine"
  if (aRegarder.length || !nuit.length) objet = "🛡️ contrôles : " + (nuit.length ? aRegarder.length + " à regarder" : "aucun compte rendu") + " · " + objet
  if (gel && gel.jours) objet = "❄️ gel annoncé · " + objet
  if (lundi) objet = "Résumé du lundi · " + objet
  if (essai) objet = "[Essai] " + objet

  let html = "<div style=\"font-family:-apple-system,Segoe UI,Roboto,sans-serif;font-size:15px;line-height:1.45;color:#1d221f;max-width:640px\">" +
    "<h1 style=\"font-size:20px;margin:0 0 4px\">Pilotage</h1>" +
    "<p style=\"margin:0;color:#5f665f\">" + echapper(E.format(auj)) + " · 🔴 " + c.retard + " en retard · 🟠 " + c.semaine + " cette semaine · ⚪ " + c.mois + " ce mois-ci</p>"
  if (gel && gel.jours) {
    html += "<h2 style=\"font-size:17px;margin:22px 0 4px\">❄️ Gel annoncé à " + echapper(gel.lieu) + "</h2><p style=\"margin:0\">" + echapper(gel.jours.join(" · ")) + "</p>" +
      "<ul style=\"margin:6px 0 0;padding-left:18px\">" + gel.taches.map((t) => "<li><a href=\"" + echapper(r.site) + "/#/tache/" + echapper(t.id) + "\" style=\"color:#2f5d8a\">" + echapper(t.titre) + "</a></li>").join("") + "</ul>"
  } else if (gel && gel.erreur) {
    html += "<p style=\"margin-top:16px\">❄️ " + echapper(gel.erreur) + "</p>"
  }
  html += section("En retard", sel.retard, auj, r.site)
  html += section("Aujourd'hui", sel.aujourdhui, auj, r.site)
  html += section("Bientôt", sel.bientot, auj, r.site)
  const texte = [objet, ""]
  if (gel && gel.jours) {
    texte.push("Gel annoncé à " + gel.lieu + " : " + gel.jours.join(", "))
    gel.taches.forEach((t) => texte.push("- " + t.titre))
    texte.push("")
  } else if (gel && gel.erreur) {
    texte.push(gel.erreur, "")
  }
  ;[["En retard", sel.retard], ["Aujourd'hui", sel.aujourdhui], ["Bientôt", sel.bientot]].forEach((s) => {
    if (s[1].length) {
      texte.push(s[0])
      s[1].forEach((el) => texte.push(texteLigne(el, auj)))
      texte.push("")
    }
  })

  if (lundi || essai) {
    const vus = {}
    sel.retard.concat(sel.aujourdhui, sel.bientot).forEach((el) => { vus[el.type + el.tache.id] = true })
    const pasVu = (el) => !vus[el.type + el.tache.id]
    const semaine = tb.semaine.filter(pasVu)
    const mois = tb.mois.filter(pasVu)
    const confort = tb.plus_tard.filter((el) => el.tache.priorite === "confort" && pasVu(el))
    html += section("La semaine à venir", semaine, auj, r.site)
    html += section("Le mois à venir", mois, auj, r.site)
    html += section("Plus tard, sans urgence (⚪)", confort, auj, r.site)
    html += section("En attente", tb.attente.filter(pasVu), auj, r.site)
    if (tb.a_completer.length) {
      html += "<p style=\"margin-top:22px\">📝 <strong>" + tb.a_completer.length + " tâche" + (tb.a_completer.length > 1 ? "s attendent" : " attend") +
        " une date</strong> (liste « À compléter » de l'accueil).</p>"
      texte.push(tb.a_completer.length + " tâche(s) attendent une date (liste « À compléter »).")
    }
  }
  // Contrôles de la nuit : une ligne si tout va bien, le détail sinon.
  html += "<h2 style=\"font-size:17px;margin:22px 0 4px\">🛡️ Contrôles de la nuit</h2><p style=\"margin:0\">" + echapper(resumeControles(nuit)) + "</p>"
  texte.push("Contrôles de la nuit : " + resumeControles(nuit))
  aRegarder.forEach((x) => {
    html += "<p style=\"margin:10px 0 0\"><strong>" + STATUT[x.statut] + " " + echapper(x.titre) + "</strong><br>" + texteHtml(x.texte) + "</p>"
    texte.push("- " + STATUT[x.statut] + " " + x.titre + " : " + x.texte)
  })
  if (lundi || essai) {
    // Résumé de la semaine : une ligne par nuit.
    const lignes = []
    for (let i = 1; i <= 7; i++) {
      const n = E.ajouterJours(auj, -i)
      lignes.push(E.format(n, true) + " : " + resumeControles(controlesDe(app, n)).replace("✅ ", ""))
    }
    html += "<p style=\"margin:10px 0 0;color:#5f665f;font-size:14px\">La semaine passée :<br>" + lignes.map(echapper).join("<br>") + "</p>"
  }
  html += "<p style=\"margin-top:26px;color:#5f665f;font-size:13px\">Un seul e-mail par jour au plus, à 7 h, et le résumé chaque lundi. " +
    "<a href=\"" + echapper(r.site) + "/#/accueil\" style=\"color:#2f5d8a\">Ouvrir le Pilotage</a></p></div>"
  texte.push("", r.site)
  return { objet: objet, html: html, texte: texte.join("\n"), aMarquer: sel.aMarquer, reglages: r, nb: sel.retard.length + sel.aujourdhui.length + sel.bientot.length }
}

function journal(app, jour, type, statut, objet, detail) {
  try {
    const r = new Record(app.findCollectionByNameOrId("envois"))
    r.set("jour", jour)
    r.set("type", type)
    r.set("statut", statut)
    r.set("objet", String(objet || "").slice(0, 300))
    r.set("detail", String(detail || "").slice(0, 2000))
    app.save(r)
  } catch (err) {
    app.logger().error("Journal des envois impossible", "error", err)
  }
}

// type : « auto » (cron) ou « essai » (réglages).
function envoyer(app, type) {
  const p = E.paris(Date.now())
  const auj = p.date
  const lundi = type !== "essai" && p.jourSemaine === 1
  const typeJournal = type === "essai" ? "essai" : lundi ? "lundi" : "quotidien"
  let m
  try {
    m = composer(app, auj, lundi, type === "essai")
  } catch (err) {
    app.logger().error("Préparation de l'e-mail impossible", "error", err)
    journal(app, auj, typeJournal, "echec", "", "Préparation de l'e-mail impossible : " + err)
    return { ok: false, message: "Préparation de l'e-mail impossible." }
  }
  if (m.rien) {
    journal(app, auj, "rien", "ok", "", "Rien à signaler ce matin : aucun e-mail envoyé. " + m.resume)
    signalDeVie(app, m.reglages.ping)
    return { ok: true, message: "Rien à signaler." }
  }
  if (!m.reglages.email) {
    journal(app, auj, typeJournal, "echec", m.objet, "Aucun destinataire : saisir l'adresse dans les réglages.")
    return { ok: false, message: "Aucun destinataire : saisissez l'adresse dans les réglages." }
  }
  try {
    app.newMailClient().send(new MailerMessage({
      from: { address: app.settings().meta.senderAddress, name: app.settings().meta.senderName || "Pilotage" },
      to: [{ address: m.reglages.email }],
      subject: m.objet,
      html: m.html,
      text: m.texte,
    }))
  } catch (err) {
    app.logger().error("Envoi de l'e-mail du Pilotage impossible", "error", err)
    journal(app, auj, typeJournal, "echec", m.objet, "Le relais e-mail a refusé l'envoi : " + err)
    return { ok: false, message: "Le relais e-mail a refusé l'envoi. Vérifiez les réglages e-mail de la console." }
  }
  if (type !== "essai") {
    m.aMarquer.forEach((t) => {
      try {
        const r = app.findRecordById("taches", t.id)
        r.set("rappel_envoye", dateBase(t.echeance))
        app.save(r)
      } catch (err) {
        app.logger().error("Rappel non marqué", "error", err, "tache", t.id)
      }
    })
  }
  journal(app, auj, typeJournal, "ok", m.objet, m.nb + " élément(s) cité(s).")
  if (type !== "essai") signalDeVie(app, m.reglages.ping)
  return { ok: true, message: "E-mail envoyé : " + m.objet }
}

// Passage du cron : à 7 h ou 8 h à Paris, une fois par jour.
function courrielDuMatin(app) {
  const p = E.paris(Date.now())
  if (p.heure < 7 || p.heure > 8) return
  const deja = app.findRecordsByFilter("envois", "jour = {:j} && type != 'essai' && statut = 'ok'", "", 1, 0, { j: p.date })
  if (deja.length) return
  const echecs = app.findRecordsByFilter("envois", "jour = {:j} && statut = 'echec'", "", 10, 0, { j: p.date })
  if (echecs.length >= 6) return
  envoyer(app, "auto")
}

// ---------- réception des comptes rendus (script de la nuit) ----------

function memesTextes(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length || !a.length) return false
  let d = 0
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return d === 0
}

// POST /api/pilotage/controles, depuis le serveur seulement (Caddy refuse
// cette adresse depuis Internet) et avec le secret de /etc/pilotage/secret
// (lisible par root et par le service du Pilotage). Le script ne peut
// qu'écrire les comptes rendus de la nuit et créer une tâche de réparation.
function recevoirControles(e) {
  const app = e.app
  let secret = ""
  try {
    secret = toString($os.readFile($os.getenv("PILOTAGE_SECRET_FICHIER") || "/etc/pilotage/secret")).trim()
  } catch (err) {
    app.logger().error("Secret des contrôles illisible", "error", err)
  }
  if (!secret || secret.length < 32 || !memesTextes(e.request.header.get("X-Pilotage-Secret"), secret)) {
    throw new UnauthorizedError("Refusé.")
  }
  const corps = e.requestInfo().body || {}
  const nuit = E.jour(String(corps.nuit || "")) || E.aujourdhui()
  const liste = Array.isArray(corps.resultats) ? corps.resultats.slice(0, 100) : []
  if (!liste.length) throw new BadRequestError("Aucun résultat.")

  // Nouveau passage la même nuit : il remplace le précédent.
  app.findRecordsByFilter("controles", "nuit = {:n}", "", 500, 0, { n: nuit }).forEach((c) => app.delete(c))
  const col = app.findCollectionByNameOrId("controles")
  let serveur = null
  let nbTaches = 0
  liste.forEach((x) => {
    const statut = ["ok", "info", "attention", "alerte"].indexOf(x.statut) >= 0 ? x.statut : "attention"
    const cle = String(x.cle || "inconnu").replace(/[^a-z0-9-]/gi, "").slice(0, 60) || "inconnu"
    const titre = String(x.titre || cle).slice(0, 120)
    const texte = String(x.texte || "").slice(0, 3000) || "Compte rendu vide."
    const r = new Record(col)
    r.set("nuit", nuit)
    r.set("cle", cle)
    r.set("titre", titre)
    r.set("statut", statut)
    r.set("texte", texte)
    app.save(r)
    if (statut !== "alerte") return
    // Alerte : une tâche critique « Réparer : … », une seule tant qu'elle est ouverte.
    const origine = "controle:" + cle
    const ouvertes = app.findRecordsByFilter("taches", "origine = {:o} && etat != 'terminee'", "", 1, 0, { o: origine })
    if (ouvertes.length) return
    if (!serveur) {
      try {
        serveur = app.findFirstRecordByFilter("domaines", "nom = 'Serveur'")
      } catch (err) {
        serveur = app.findRecordsByFilter("domaines", "id != ''", "ordre", 1, 0)[0]
      }
    }
    const t = new Record(app.findCollectionByNameOrId("taches"))
    const valeurs = {
      titre: "Réparer : " + titre, domaine: serveur.id, priorite: "critique", mode: "unique", souplesse: "imperative",
      tolerance: 0, echeance: nuit + " 00:00:00.000Z", etat: "active", origine: origine,
      notes: "Créée automatiquement par les contrôles de la nuit du " + E.format(nuit) + ".\n\n" + texte,
    }
    Object.keys(valeurs).forEach((k) => t.set(k, valeurs[k]))
    app.save(t)
    nbTaches++
  })
  // Comptes rendus gardés 90 jours.
  const limite = E.ajouterJours(nuit, -90)
  app.findRecordsByFilter("controles", "nuit < {:l}", "", 2000, 0, { l: limite }).forEach((c) => app.delete(c))
  return { enregistres: liste.length, taches: nbTaches }
}

module.exports = {
  recevoirControles: recevoirControles,
  avantHistorique: avantHistorique,
  apresHistorique: apresHistorique,
  envoyer: envoyer,
  courrielDuMatin: courrielDuMatin,
}
