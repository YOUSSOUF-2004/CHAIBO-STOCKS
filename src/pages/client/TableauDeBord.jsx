import React from "react";
import {
  ArrowRight,
  ArrowUpRight,
  ArrowDownLeft,
  Wallet,
  ShieldCheck,
  ArrowLeftRight,
  Eye,
  EyeOff,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { money } from "../../utils/format";
import Transactions from "../../components/Transactions";
export default function TableauDeBord() {
  const {
    profile,
    balance,
    operations,
    setFilter,
    hidden,
    setHidden,
    go,
    actions,
  } = useApp();
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">HEUREUX DE VOUS RETROUVER</span>
          <h1>
            Bonjour, {profile.name.split(" ")[0]}{" "}
            <span className="wave">✦</span>
          </h1>
          <p>Gardez un œil sur votre argent, en toute simplicité.</p>
        </div>
        <span className="date-chip">
          {new Date().toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </span>
      </div>
      <div className="dashboard-grid">
        <div className="balance-card">
          <div className="balance-top">
            <span>
              <Wallet size={19} /> Solde disponible
            </span>
            <button
              onClick={() => setHidden(!hidden)}
              aria-label="Afficher ou masquer le solde"
            >
              {hidden ? <EyeOff size={19} /> : <Eye size={19} />}
            </button>
          </div>
          <h2>
            {hidden
              ? "••• •••"
              : new Intl.NumberFormat("fr-FR").format(balance)}{" "}
            <small>FCFA</small>
          </h2>
          <div className="balance-footer">
            <span>
              <span className="live-dot" />
              Mis à jour en temps réel
            </span>
            <ShieldCheck size={22} />
          </div>
        </div>
        <div className="quick-actions">
          <h3>Que souhaitez-vous faire ?</h3>
          <div>
            {actions.map(([id, label, Icon, color]) => (
              <button key={id} onClick={() => go(id)}>
                <span className={"icon-tile " + color}>
                  <Icon />
                </span>
                <b>{label}</b>
                <ArrowUpRight size={14} />
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="stats-row">
        <div>
          <span className="icon-tile green">
            <ArrowDownLeft />
          </span>
          <div>
            <small>Total des dépôts validés</small>
            <b>
              {money(
                operations
                  .filter((o) => o.type === "Dépôt" && o.status === "Validé")
                  .reduce((s, o) => s + o.amount, 0),
              )}
            </b>
          </div>
        </div>
        <div>
          <span className="icon-tile orange">
            <ArrowUpRight />
          </span>
          <div>
            <small>Total des sorties</small>
            <b>
              {money(
                operations
                  .filter((o) => o.type !== "Dépôt")
                  .reduce((s, o) => s + o.amount, 0),
              )}
            </b>
          </div>
        </div>
        <div>
          <span className="icon-tile purple">
            <ArrowLeftRight />
          </span>
          <div>
            <small>Opérations réalisées</small>
            <b>{operations.length} opérations</b>
          </div>
        </div>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h3>Dernières opérations</h3>
            <p>Les mouvements récents de votre compte</p>
          </div>
          <button
            className="text-button"
            onClick={() => {
              setFilter("Tous");
              go("historique");
            }}
          >
            Tout voir <ArrowRight size={16} />
          </button>
        </div>
        <Transactions limit={5} />
      </section>
      <div className="security-note">
        <ShieldCheck size={20} />
        <span>
          Votre tranquillité, notre priorité.{" "}
          <b>Gardez vos identifiants confidentiels.</b>
        </span>
      </div>
    </>
  );
}
