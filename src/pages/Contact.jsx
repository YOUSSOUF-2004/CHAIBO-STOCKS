import React, { useState, useRef } from "react";
import { Mail, MessageCircle, ShieldCheck, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { API_MODE, api } from "../services/api";
import {
  SUPPORT_EMAIL,
  SUPPORT_PHONE,
  WHATSAPP_URL,
} from "../services/support";
export default function Contact() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [receipt, setReceipt] = useState(null);
  const pending = useRef(null),
    sending = useRef(false);
  async function submit(event) {
    event.preventDefault();
    if (sending.current) return;
    const form = event.currentTarget,
      fields = new FormData(form);
    const payload = Object.fromEntries(
      ["name", "email", "subject", "message", "website"].map((key) => [
        key,
        String(fields.get(key) || "").trim(),
      ]),
    );
    if (!API_MODE) {
      setError(
        "Cette démonstration ne transmet pas les messages. Contactez le support sur WhatsApp ou par e-mail.",
      );
      return;
    }
    const signature = JSON.stringify(payload);
    if (!pending.current || pending.current.signature !== signature)
      pending.current = { signature, key: crypto.randomUUID() };
    sending.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await api("contact/", {
        method: "POST",
        data: { ...payload, request_id: pending.current.key },
      });
      setReceipt(result);
      pending.current = null;
      form.reset();
    } catch (cause) {
      setError(
        cause.message ||
          "Impossible d’enregistrer votre message. Réessayez ou contactez-nous sur WhatsApp.",
      );
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }
  return (
    <main className="contact-page">
      <div className="contact-heading">
        <span className="eyebrow">À VOTRE ÉCOUTE</span>
        <h1>Contactez notre équipe</h1>
        <p>
          Une question sur votre compte ou une opération ? Écrivez-nous ici ou
          sur WhatsApp.
        </p>
      </div>
      <div className="contact-grid">
        <section className="panel contact-form-panel">
          <h2>Envoyer un message</h2>
          {!API_MODE && (
            <p className="info-message">
              Mode démonstration : ce formulaire n’envoie aucun message. Le
              bouton WhatsApp reste disponible.
            </p>
          )}
          {receipt ? (
            <div className="contact-success" role="status">
              <CheckCircle2 size={32} />
              <h3>Message enregistré</h3>
              <p>{receipt.detail}</p>
              <p>
                Votre référence :{" "}
                <strong className="contact-reference">{receipt.id}</strong>
              </p>
              <p>
                Vous pouvez aussi nous communiquer cette référence sur WhatsApp.
              </p>
              <button
                type="button"
                className="btn secondary"
                onClick={() => setReceipt(null)}
              >
                Écrire un autre message
              </button>
            </div>
          ) : (
            <form onSubmit={submit} aria-label="Formulaire de contact">
              <div className="contact-fields">
                <label>
                  Votre nom
                  <input
                    name="name"
                    autoComplete="name"
                    maxLength={150}
                    required
                    disabled={busy}
                  />
                </label>
                <label>
                  Votre adresse e-mail
                  <input
                    name="email"
                    type="email"
                    autoComplete="email"
                    maxLength={254}
                    required
                    disabled={busy}
                  />
                </label>
              </div>
              <label>
                Sujet
                <input
                  name="subject"
                  placeholder="Ex. : une question sur mon dépôt"
                  maxLength={150}
                  required
                  disabled={busy}
                />
              </label>
              <label>
                Votre message
                <textarea
                  name="message"
                  rows={6}
                  minLength={10}
                  maxLength={4000}
                  required
                  disabled={busy}
                  placeholder="Expliquez votre demande (10 caractères minimum)."
                />
              </label>
              <div className="contact-honeypot" aria-hidden="true">
                <label>
                  Votre site internet
                  <input name="website" tabIndex={-1} autoComplete="off" />
                </label>
              </div>
              <p className="contact-privacy">
                <ShieldCheck size={18} />
                N’indiquez jamais votre mot de passe, code secret ou coordonnées
                bancaires dans ce message. Vos coordonnées servent à vous
                répondre.
              </p>
              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
              <button
                className="btn full"
                type="submit"
                disabled={busy || !API_MODE}
              >
                {busy ? "Enregistrement…" : "Envoyer mon message"}
              </button>
              {!API_MODE && (
                <p className="muted">
                  L’envoi du formulaire nécessite le backend Django.
                </p>
              )}
            </form>
          )}
        </section>
        <aside className="contact-aside">
          <section className="panel contact-channel">
            <span className="icon-tile green">
              <MessageCircle />
            </span>
            <h2>Parlons sur WhatsApp</h2>
            <p>
              Ouvrez une conversation avec notre service. Vous pourrez vérifier
              le destinataire puis envoyer votre message.
            </p>
            <a
              className="btn whatsapp-button"
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              Ouvrir WhatsApp
            </a>
            <small>+{SUPPORT_PHONE.replace(/\D/g, "")}</small>
          </section>
          <section className="panel contact-channel">
            <span className="icon-tile blue">
              <Mail />
            </span>
            <h2>Par e-mail</h2>
            <a className="contact-email" href={`mailto:${SUPPORT_EMAIL}`}>
              {SUPPORT_EMAIL}
            </a>
            <p>
              Si votre messagerie ne s’ouvre pas, copiez cette adresse dans
              Gmail ou utilisez le formulaire.
            </p>
          </section>
          <Link className="text-button" to="/accueil">
            Retour à l’accueil
          </Link>
        </aside>
      </div>
    </main>
  );
}
