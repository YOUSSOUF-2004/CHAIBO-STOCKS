import { MESSAGING_ENABLED } from "../services/features";
import React, { useState } from "react";
import { API_MODE, api } from "../services/api";
import { useApp } from "../context/AppContext";
export default function MotDePasseOublie() {
  const { go } = useApp();
  const [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    const email = new FormData(event.currentTarget).get("email");
    setBusy(true);
    setError("");
    try {
      const result = await api("auth/password-reset/", {
        method: "POST",
        data: { email },
      });
      setMessage(result.detail);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-page">
      <div className="auth-brand">
        <h1>Retrouver votre accès.</h1>
        <p>{MESSAGING_ENABLED ? "Recevez un lien pour choisir un nouveau mot de passe." : "La réinitialisation par e-mail est temporairement indisponible."}</p>
      </div>
      <section className="auth-card">
        <button className="back-link" onClick={() => go("connexion")}>
          ← Retour à la connexion
        </button>
        <h2>Mot de passe oublié</h2>
        {!MESSAGING_ENABLED ? (
          <p className="info-message">L’envoi de liens par e-mail n’est pas encore activé.</p>
        ) : API_MODE ? (
          <form onSubmit={submit}>
            <label>
              Adresse e-mail du compte
              <input type="email" name="email" autoComplete="email" required />
            </label>
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            {message && (
              <p role="status" className="info-message">
                {message}
              </p>
            )}
            <button type="submit" className="btn full" disabled={busy}>
              Envoyer le lien
            </button>
          </form>
        ) : (
          <>
            <p className="info-message">
              La démonstration locale ne possède pas de serveur
              d’authentification. Ouvrez l’espace de démonstration depuis la
              connexion.
            </p>
            <button className="btn full" onClick={() => go("connexion")}>
              Retour à la connexion
            </button>
          </>
        )}
      </section>
    </main>
  );
}
