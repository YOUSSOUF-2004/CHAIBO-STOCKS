import { API_MODE } from "../services/api";
import React from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Wallet,
  ShieldCheck,
  User,
  Eye,
  EyeOff,
  Lock,
} from "lucide-react";
import { useApp } from "../context/AppContext";
export default function Inscription() {
  const {
    setSession,
    setProfile,
    hidden,
    setHidden,
    role,
    setRole,
    error,
    setError,
    go,
    notify,
    persist,
  } = useApp();
  const { register, apiBusy } = useApp();
  return (
    <main className="auth-page">
      <div className="auth-brand">
        <span className="eyebrow">BIENVENUE CHEZ VOUS</span>
        <h1>
          Un compte clair.
          <br />
          L’esprit <em>tranquille.</em>
        </h1>
        <p>
          Retrouvez l’essentiel de vos opérations dans un espace pensé pour
          vous.
        </p>
        <div className="auth-illustration">
          <Wallet size={90} />
          <span>
            <ShieldCheck size={32} />
          </span>
        </div>
        <small>
          {API_MODE
            ? "CHAIBO STOCK · Votre espace personnel"
            : "Démonstration React · Aucun service financier réel"}
        </small>
      </div>
      <section className="auth-card">
        <button className="back-link" onClick={() => go("accueil")}>
          ← Retour à l’accueil
        </button>
        <h2>{"Créer un compte"}</h2>
        <p>{"Votre nouvel espace commence ici."}</p>
        {
          <>
            {!API_MODE && (
              <div className="tabs role-tabs">
                <button
                  className={role === "client" ? "active" : ""}
                  onClick={() => setRole("client")}
                >
                  <User size={16} />
                  Client
                </button>
                <button
                  className={role === "admin" ? "active" : ""}
                  onClick={() => setRole("admin")}
                >
                  <ShieldCheck size={16} />
                  Administrateur
                </button>
              </div>
            )}
            <form
              onSubmit={(e) => {
                if (API_MODE) {
                  register(e);
                  return;
                }
                {
                  e.preventDefault();
                  let d = new FormData(e.currentTarget);
                  if (d.get("password") !== d.get("confirm")) {
                    setError("Les mots de passe ne correspondent pas.");
                    return;
                  }
                  let p = {
                    name: d.get("name"),
                    phone: d.get("phone"),
                    email: d.get("email"),
                  };
                  setProfile(p);
                  persist("profile", p);
                  setSession(role);
                  go(role === "admin" ? "admin" : "dashboard");
                  notify("Votre profil de démonstration a été créé.");
                }
              }}
            >
              {
                <label>
                  Nom et prénoms
                  <input name="name" placeholder="Votre nom complet" required />
                </label>
              }
              <label>
                Numéro de téléphone
                <input
                  name="phone"
                  type="tel"
                  placeholder="+235 66 00 00 00"
                  required
                  minLength={8}
                />
              </label>
              {
                <label>
                  Adresse e-mail <span>(facultatif)</span>
                  <input
                    name="email"
                    type="email"
                    placeholder="vous@exemple.com"
                  />
                </label>
              }
              <label>
                Mot de passe
                <div className="password-field">
                  <input
                    name="password"
                    type={hidden ? "text" : "password"}
                    placeholder="Au moins 10 caractères"
                    minLength={API_MODE ? 10 : 6}
                    required
                  />
                  <button
                    type="button"
                    aria-label="Afficher le mot de passe"
                    onClick={() => setHidden(!hidden)}
                  >
                    {hidden ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </label>
              {
                <>
                  <label>
                    Confirmer le mot de passe
                    <input
                      name="confirm"
                      type="password"
                      minLength={API_MODE ? 10 : 6}
                      required
                      placeholder="Saisir à nouveau le mot de passe"
                    />
                  </label>
                  <label className="checkbox">
                    <input type="checkbox" required />
                    {API_MODE
                      ? "J’accepte la création de mon compte et le stockage de mes informations."
                      : "J’accepte l’utilisation de données de démonstration locales."}
                  </label>
                </>
              }
              {error && <p className="error">{error}</p>}
              <button className="btn full" type="submit" disabled={apiBusy}>
                {"Créer mon compte"}
                <ArrowRight size={18} />
              </button>
            </form>
            {!API_MODE && (
              <div className="auth-divider">ou découvrez sans inscription</div>
            )}
            {!API_MODE && (
              <button
                className="btn secondary full"
                onClick={() => {
                  setSession(role);
                  go(role === "admin" ? "admin" : "dashboard");
                }}
              >
                Ouvrir la démonstration <ArrowUpRight size={17} />
              </button>
            )}
            <p className="auth-switch">
              {"Vous avez déjà un compte ?"}{" "}
              <button onClick={() => go("connexion")}>{"Se connecter"}</button>
            </p>
            {!API_MODE && (
              <small className="auth-disclaimer">
                <Lock size={12} /> Ne saisissez pas de mot de passe réel. Aucun
                mot de passe n’est conservé.
              </small>
            )}
          </>
        }
      </section>
    </main>
  );
}
