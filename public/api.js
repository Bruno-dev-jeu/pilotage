// Client minimal de l'API PocketBase du Pilotage (même origine que les pages).
// Repris de Courses (même principe), avec la double authentification :
// mot de passe, puis code à usage unique reçu par e-mail.
// Session : jeton du compte gardé dans le stockage local. Un jeton expiré ou
// refusé n'est jamais ignoré : PocketBase répondrait par une liste vide sans
// erreur, ce qui ferait croire à une absence de tâches. On vérifie donc la
// date d'expiration avant chaque appel et on renvoie vers la connexion.
(function () {
  "use strict";

  var CLE = "pilotage.session";
  var session = null;
  var surExpiration = function () {};
  var jetonFichier = null; // { jeton, fin } : jeton de fichiers, réutilisé 2 minutes

  function lireSession() {
    try {
      var brut = window.localStorage.getItem(CLE);
      session = brut ? JSON.parse(brut) : null;
    } catch (e) {
      session = null;
    }
  }

  function ecrireSession(s) {
    session = s;
    jetonFichier = null;
    try {
      if (s) window.localStorage.setItem(CLE, JSON.stringify(s));
      else window.localStorage.removeItem(CLE);
    } catch (e) {
      // stockage indisponible (navigation privée) : session pour cet onglet seulement
    }
  }

  function expiration(jeton) {
    try {
      var charge = jeton.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      return JSON.parse(window.atob(charge)).exp * 1000;
    } catch (e) {
      return 0;
    }
  }

  function jetonValide() {
    return !!(session && session.jeton && expiration(session.jeton) > Date.now() + 30000);
  }

  function ErreurApi(message, statut, donnees) {
    this.message = message;
    this.statut = statut;
    this.donnees = donnees || null;
  }

  // Message lisible d'une réponse d'erreur PocketBase (détail des champs).
  function messageErreur(donnees, statut) {
    if (!donnees) return "Erreur " + statut;
    var m = donnees.message || "Erreur " + statut;
    if (donnees.data && typeof donnees.data === "object") {
      var details = Object.keys(donnees.data).map(function (k) {
        var d = donnees.data[k];
        return d && d.message ? k + " : " + d.message : "";
      }).filter(Boolean);
      if (details.length) m += " (" + details.join(" ; ") + ")";
    }
    return m;
  }

  // corps : objet envoyé en JSON, ou FormData (fichiers : le navigateur
  // pose lui-même l'en-tête multipart).
  function appel(methode, chemin, corps, sansJeton) {
    var formulaire = typeof FormData !== "undefined" && corps instanceof FormData;
    var entetes = formulaire ? {} : { "Content-Type": "application/json" };
    if (!sansJeton) {
      if (!jetonValide()) {
        ecrireSession(null);
        surExpiration();
        return Promise.reject(new ErreurApi("Session expirée", 401));
      }
      entetes.Authorization = session.jeton;
    }
    return fetch(chemin, {
      method: methode,
      headers: entetes,
      body: corps ? (formulaire ? corps : JSON.stringify(corps)) : undefined,
    }).then(function (r) {
      return r.text().then(function (texte) {
        var donnees = null;
        try {
          donnees = texte ? JSON.parse(texte) : null;
        } catch (e) {
          donnees = null;
        }
        if (r.status === 401 && !sansJeton) {
          ecrireSession(null);
          surExpiration();
        }
        if (!r.ok) throw new ErreurApi(messageErreur(donnees, r.status), r.status, donnees);
        return donnees;
      });
    }, function () {
      throw new ErreurApi("Pas de connexion au serveur. Vérifiez le réseau.", 0);
    });
  }

  // Envoi de fichiers avec avancement (vidéos de 100 Mo et plus) :
  // fetch ne donne pas l'avancement d'un envoi, XMLHttpRequest si.
  function envoiSuivi(methode, chemin, formulaire, surAvancement) {
    if (!jetonValide()) {
      ecrireSession(null);
      surExpiration();
      return Promise.reject(new ErreurApi("Session expirée", 401));
    }
    return new Promise(function (ok, ko) {
      var x = new XMLHttpRequest();
      x.open(methode, chemin);
      x.setRequestHeader("Authorization", session.jeton);
      if (x.upload && surAvancement) {
        x.upload.onprogress = function (ev) {
          if (ev.lengthComputable) surAvancement(ev.loaded / ev.total);
        };
      }
      x.onload = function () {
        var donnees = null;
        try {
          donnees = x.responseText ? JSON.parse(x.responseText) : null;
        } catch (e) {
          donnees = null;
        }
        if (x.status >= 200 && x.status < 300) ok(donnees);
        else ko(new ErreurApi(x.status === 413 ? "Fichier trop gros pour le serveur." : messageErreur(donnees, x.status), x.status, donnees));
      };
      x.onerror = function () {
        ko(new ErreurApi("Envoi interrompu : vérifiez le réseau.", 0));
      };
      x.send(formulaire);
    });
  }

  function requete(params) {
    var morceaux = [];
    Object.keys(params).forEach(function (k) {
      if (params[k] !== undefined && params[k] !== null && params[k] !== "") {
        morceaux.push(encodeURIComponent(k) + "=" + encodeURIComponent(params[k]));
      }
    });
    return morceaux.length ? "?" + morceaux.join("&") : "";
  }

  function texteFiltre(v) {
    return "'" + String(v).replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "'";
  }

  function garderSession(d) {
    ecrireSession({ jeton: d.token, utilisateur: { id: d.record.id, email: d.record.email, nom: d.record.name || "" } });
  }

  var Api = {
    connecte: function () {
      return jetonValide();
    },
    sessionExpiree: function () {
      if (session && !jetonValide()) {
        ecrireSession(null);
        return true;
      }
      return false;
    },
    utilisateur: function () {
      return session ? session.utilisateur : null;
    },
    surExpiration: function (fn) {
      surExpiration = fn;
    },
    // Première étape : mot de passe. Rend { fini: true } si la connexion est
    // faite, ou { mfaId, otpId } quand un code a été envoyé par e-mail.
    connexion: function (email, mdp) {
      return appel("POST", "/api/collections/users/auth-with-password", { identity: email, password: mdp }, true)
        .then(function (d) {
          garderSession(d);
          return { fini: true };
        }, function (e) {
          var mfaId = e && e.donnees && e.donnees.mfaId;
          if (!mfaId) throw e;
          return appel("POST", "/api/collections/users/request-otp", { email: email }, true).then(function (d) {
            return { mfaId: mfaId, otpId: d.otpId };
          });
        });
    },
    // Seconde étape : code reçu par e-mail.
    code: function (etape, code) {
      return appel("POST", "/api/collections/users/auth-with-otp", { otpId: etape.otpId, password: code, mfaId: etape.mfaId }, true)
        .then(garderSession);
    },
    rafraichir: function () {
      if (!jetonValide()) return Promise.reject(new ErreurApi("Session expirée", 401));
      return appel("POST", "/api/collections/users/auth-refresh").then(function (d) {
        ecrireSession({ jeton: d.token, utilisateur: session.utilisateur });
      });
    },
    deconnexion: function () {
      ecrireSession(null);
    },
    finSession: function () {
      return session && session.jeton ? new Date(expiration(session.jeton)) : null;
    },
    liste: function (collection, params) {
      return appel("GET", "/api/collections/" + collection + "/records" + requete(params || {}));
    },
    // Toutes les pages d'une liste, plafonnées (protection du téléphone).
    tout: function (collection, params, plafond) {
      var max = plafond || 3000;
      var res = [];
      var taille = 500;
      function page(n) {
        var p = Object.assign({}, params, { page: n, perPage: taille, skipTotal: 1 });
        return Api.liste(collection, p).then(function (d) {
          res = res.concat(d.items);
          if (d.items.length === taille && res.length < max) return page(n + 1);
          return res;
        });
      }
      return page(1);
    },
    un: function (collection, id, params) {
      return appel("GET", "/api/collections/" + collection + "/records/" + encodeURIComponent(id) + requete(params || {}));
    },
    creer: function (collection, donnees) {
      return appel("POST", "/api/collections/" + collection + "/records", donnees);
    },
    modifier: function (collection, id, donnees) {
      return appel("PATCH", "/api/collections/" + collection + "/records/" + encodeURIComponent(id), donnees);
    },
    supprimer: function (collection, id) {
      return appel("DELETE", "/api/collections/" + collection + "/records/" + encodeURIComponent(id));
    },
    // Création ou modification avec fichiers (FormData), avec avancement.
    creerFormulaire: function (collection, formulaire, surAvancement) {
      return envoiSuivi("POST", "/api/collections/" + collection + "/records", formulaire, surAvancement);
    },
    modifierFormulaire: function (collection, id, formulaire, surAvancement) {
      return envoiSuivi("PATCH", "/api/collections/" + collection + "/records/" + encodeURIComponent(id), formulaire, surAvancement);
    },
    // Adresse d'un fichier protégé, avec un jeton de fichier de courte durée
    // (PocketBase : 2 minutes ; réutilisé 90 secondes).
    urlFichier: function (collection, id, nom, params) {
      var suite = function (jeton) {
        return "/api/files/" + collection + "/" + id + "/" + encodeURIComponent(nom) + "?token=" + encodeURIComponent(jeton) + (params ? "&" + params : "");
      };
      if (jetonFichier && jetonFichier.fin > Date.now()) return Promise.resolve(suite(jetonFichier.jeton));
      return appel("POST", "/api/files/token").then(function (d) {
        jetonFichier = { jeton: d.token, fin: Date.now() + 90000 };
        return suite(d.token);
      });
    },
    essaiCourriel: function () {
      return appel("POST", "/api/pilotage/essai-courriel");
    },
    texteFiltre: texteFiltre,
  };

  lireSession();
  window.Api = Api;
})();
