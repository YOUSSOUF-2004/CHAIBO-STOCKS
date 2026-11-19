import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api, API_MODE } from "../services/api";
import { useApp } from "../context/AppContext";
export default function ReinitialiserMotDePasse() {
  const [params] = useSearchParams();
  const { go } = useApp();
  const [error, setError] = useState(""),
    [done, setDone] = useState(false),
    [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (f.get("password") !== f.get("confirm")) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api("auth/password-reset/confirm/", {
        method: "POST",
        data: {
          uid: params.get("uid"),
          token: params.get("token"),
          password: f.get("password"),
        },
      });
      setDone(true);
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-page">
      <div className="auth-brand">
        <h1>Un nouveau départ.</h1>
      </div>
      <section className="auth-card">
        <h2>Nouveau mot de passe</h2>
        {!API_MODE ? (
          <p className="info-message">
            La réinitialisation nécessite le backend Django.
          </p>
        ) : done ? (
          <>
            <p className="info-message" role="status">
              Mot de passe modifié. Vous pouvez vous reconnecter.
            </p>
            <button className="btn full" onClick={() => go("connexion")}>
              Se connecter
            </button>
          </>
        ) : (
          <form onSubmit={submit}>
            <label>
              Nouveau mot de passe
              <input
                name="password"
                type="password"
                minLength={10}
                autoComplete="new-password"
                required
              />
            </label>
            <label>
              Confirmer
              <input
                name="confirm"
                type="password"
                minLength={10}
                autoComplete="new-password"
                required
              />
            </label>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <button
              className="btn full"
              type="submit"
              disabled={busy || !params.get("token") || !params.get("uid")}
            >
              Enregistrer le mot de passe
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
