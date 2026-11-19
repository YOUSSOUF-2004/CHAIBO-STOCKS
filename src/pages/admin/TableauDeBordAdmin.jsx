import { API_MODE } from "../../services/api";
import React from "react";
import {
  ArrowRight,
  Wallet,
  ArrowLeftRight,
  Download,
  Users,
  TrendingUp,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { money } from "../../utils/format";
import Transactions from "../../components/Transactions";
export default function TableauDeBordAdmin() {
  const { operations, clients, go } = useApp();
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">ESPACE ADMINISTRATEUR</span>
          <h1>Tableau de bord</h1>
          <p>Une vue claire de l’activité de CHAIBO STOCK.</p>
        </div>
        <span className="demo-tag">
          {API_MODE ? "Données du serveur" : "Données de démonstration"}
        </span>
      </div>
      <div className="admin-stats">
        {[
          [Users, "Clients", clients.length, "blue"],
          [
            Wallet,
            "Solde total",
            money(clients.reduce((s, c) => s + c.balance, 0)),
            "green",
          ],
          [
            Download,
            "Dépôts en attente",
            operations.filter((o) => o.status === "En attente").length,
            "purple",
          ],
          [ArrowLeftRight, "Opérations", operations.length, "orange"],
        ].map(([Icon, label, value, color]) => (
          <div className="panel" key={label}>
            <span className={"icon-tile " + color}>
              <Icon />
            </span>
            <small>{label}</small>
            <h2>{value}</h2>
          </div>
        ))}
      </div>
      <div className="panel chart-panel">
        <div className="panel-heading">
          <div>
            <h3>Répartition des opérations</h3>
            <p>
              {API_MODE
                ? "Montants cumulés des opérations enregistrées"
                : "Montants cumulés de la démonstration"}
            </p>
          </div>
          <TrendingUp className="positive" />
        </div>
        <div className="bar-chart">
          {["Dépôt", "Retrait", "Transfert"].map((t, i) => {
            let total = operations
              .filter((o) => o.type === t)
              .reduce((s, o) => s + o.amount, 0);
            let max = Math.max(
              ...["Dépôt", "Retrait", "Transfert"].map((t) =>
                operations
                  .filter((o) => o.type === t)
                  .reduce((s, o) => s + o.amount, 0),
              ),
              1,
            );
            return (
              <div key={t}>
                <b>{money(total)}</b>
                <div
                  className={"bar bar-" + i}
                  style={{
                    height: Math.max(8, (total / max) * 155),
                  }}
                />
                <span>{t}s</span>
              </div>
            );
          })}
        </div>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <h3>Opérations récentes</h3>
          <button className="text-button" onClick={() => go("operations")}>
            Gérer les opérations <ArrowRight size={16} />
          </button>
        </div>
        <Transactions limit={4} />
      </section>
    </>
  );
}
