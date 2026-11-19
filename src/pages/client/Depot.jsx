import { API_MODE } from "../../services/api";
import React from "react";
import { ArrowRight, ShieldCheck, Download, Check } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { money } from "../../utils/format";
export default function Depot() {
  const { balance, amount, setAmount, error, go, transact } = useApp();
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">VOS OPÉRATIONS EN QUELQUES CLICS</span>
          <h1>{"Dépôt & retrait"}</h1>
          <p>Simple, rapide et accessible à tout moment.</p>
        </div>
      </div>
      <div className="operation-layout">
        <section className="panel operation-form">
          {
            <div className="tabs">
              <button className={"active"} onClick={() => go("depot")}>
                Dépôt
              </button>
              <button className={""} onClick={() => go("retrait")}>
                Retrait
              </button>
            </div>
          }
          <span className={"icon-tile large " + "green"}>{<Download />}</span>
          <h2>{"Alimenter mon compte"}</h2>
          <p className="muted">
            Solde disponible : <b>{money(balance)}</b>
          </p>
          <form onSubmit={transact}>
            {false}
            <label>
              Montant (FCFA)
              <input
                type="number"
                min="1"
                step="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                required
              />
            </label>
            <div className="amount-options">
              {[5000, 10000, 25000, 50000].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setAmount(String(n))}
                >
                  {new Intl.NumberFormat("fr-FR").format(n)}
                </button>
              ))}
            </div>
            <label>
              {"Référence"} <span>(facultatif)</span>
              <input name="reference" placeholder="Ajouter une précision" />
            </label>
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            <button className="btn full" type="submit">
              {"Demander le dépôt"}
              <ArrowRight size={18} />
            </button>
          </form>
        </section>
        <aside className="operation-info">
          <ShieldCheck size={35} />
          <h3>Vous gardez le contrôle.</h3>
          <p>
            Vérifiez le montant et les coordonnées avant de confirmer votre
            opération.
          </p>
          <div>
            <Check size={16} />
            {API_MODE
              ? "Aucun frais appliqué"
              : "Aucun frais dans la démonstration"}
          </div>
          <div>
            <Check size={16} />
            Historique toujours accessible
          </div>
          <div>
            <Check size={16} />
            Confirmation avant chaque opération
          </div>
          {
            <p className="info-message">
              Votre dépôt apparaîtra dans votre solde après validation par un
              administrateur.
            </p>
          }
          <small>
            {API_MODE
              ? "Opération interne enregistrée sur votre compte CHAIBO STOCK."
              : "Démonstration locale. Aucun argent réel n’est transféré."}
          </small>
        </aside>
      </div>
    </>
  );
}
