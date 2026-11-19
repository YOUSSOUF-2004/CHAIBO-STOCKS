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
export default function Connexion() {
  const { setSession, hidden, setHidden, role, setRole, error, go, login } =
    useApp();
  const { apiBusy } = useApp();
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
        <h2>{"Heureux de vous revoir"}</h2>
        <p>{"Connectez-vous à votre espace CHAIBO STOCK."}</p>
        {
          <>
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
            <form
              onSubmit={(e) => {
                login(e);
              }}
            >
              {false}
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
              {false}
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
                <div className="auth-options">
                  <span className="muted">
                    {API_MODE
                      ? "Connexion sécurisée par session"
                      : "Accès de démonstration"}
                  </span>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => go("oublie")}
                  >
                    Mot de passe oublié ?
                  </button>
                </div>
              }
              {error && <p className="error">{error}</p>}
              <button className="btn full" type="submit" disabled={apiBusy}>
                {"Se connecter"}
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
              {"Pas encore de compte ?"}{" "}
              <button onClick={() => go("inscription")}>
                {"Créer un compte"}
              </button>
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
