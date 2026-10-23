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
    if (r.length) return { email: r[0].getString("email_rappels"), site: r[0].getString("adresse_site") || "https://pilotage.bmlab.fr" }
  } catch (err) {
    // pas encore de réglages
  }
  return { email: "", site: "https://pilotage.bmlab.fr" }
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

// Construit l'e-mail. Rend null s'il n'y a rien à envoyer (sauf lundi et essai).
function composer(app, auj, lundi, essai) {
  const r = reglages(app)
  const taches = chargerTaches(app)
  const sel = E.courriel(taches, auj, lundi || essai)
  const tb = E.tableau(taches, auj)
  const rien = !sel.retard.length && !sel.aujourdhui.length && !sel.bientot.length
  if (rien && !lundi && !essai) return { rien: true, reglages: r }

  const c = tb.compteurs
  let objet = (c.retard ? "🔴 " + c.retard + " en retard" : "✅ rien en retard") + " · 🟠 " + c.semaine + " cette semaine"
  if (lundi) objet = "Résumé du lundi · " + objet
  if (essai) objet = "[Essai] " + objet

  let html = "<div style=\"font-family:-apple-system,Segoe UI,Roboto,sans-serif;font-size:15px;line-height:1.45;color:#1d221f;max-width:640px\">" +
    "<h1 style=\"font-size:20px;margin:0 0 4px\">Pilotage</h1>" +
    "<p style=\"margin:0;color:#5f665f\">" + echapper(E.format(auj)) + " · 🔴 " + c.retard + " en retard · 🟠 " + c.semaine + " cette semaine · ⚪ " + c.mois + " ce mois-ci</p>"
  html += section("En retard", sel.retard, auj, r.site)
  html += section("Aujourd'hui", sel.aujourdhui, auj, r.site)
  html += section("Bientôt", sel.bientot, auj, r.site)
  const texte = [objet, ""]
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
    journal(app, auj, "rien", "ok", "", "Rien à signaler ce matin : aucun e-mail envoyé.")
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

module.exports = {
  avantHistorique: avantHistorique,
  apresHistorique: apresHistorique,
  envoyer: envoyer,
  courrielDuMatin: courrielDuMatin,
}
