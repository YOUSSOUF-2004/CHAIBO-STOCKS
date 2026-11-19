import React from "react";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { money } from "../utils/format";
import { useApp } from "../context/AppContext";
export default function Transactions({ limit }) {
  const { operations, filter, query, page, validate, apiMode, apiBusy } =
    useApp();
  let list = operations
    .filter(
      (o) =>
        (filter === "Tous" || o.type === filter) &&
        (!query ||
          (o.name + " " + o.type).toLowerCase().includes(query.toLowerCase())),
    )
    .slice(0, limit || 999);
  return (
    <div className="transactions">
      {list.length ? (
        list.map((o) => (
          <div className="transaction" key={o.id}>
            <span
              className={
                "icon-tile " +
                ((o.direction ? o.direction === "credit" : o.type === "Dépôt")
                  ? "green"
                  : o.type === "Transfert"
                    ? "purple"
                    : "orange")
              }
            >
              {(o.direction ? o.direction === "credit" : o.type === "Dépôt") ? (
                <ArrowDownLeft />
              ) : (
                <ArrowUpRight />
              )}
            </span>
            <div className="transaction-label">
              <b>{o.name}</b>
              <small>
                {new Date(o.date).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "short",
                })}{" "}
                ·{" "}
                {new Date(o.date).toLocaleTimeString("fr-FR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </small>
            </div>
            <div className="transaction-amount">
              <b
                className={
                  (o.direction ? o.direction === "credit" : o.type === "Dépôt")
                    ? "positive"
                    : ""
                }
              >
                {(o.direction ? o.direction === "credit" : o.type === "Dépôt")
                  ? "+"
                  : "−"}{" "}
                {money(o.amount)}
              </b>
              <small className={o.status === "En attente" ? "pending" : ""}>
                {o.status}
              </small>
            </div>
            {page === "operations" && o.status === "En attente" && (
              <>
                <button
                  className="btn small"
                  disabled={apiBusy}
                  onClick={() => validate(o.id)}
                >
                  Valider
                </button>
                {apiMode && (
                  <button
                    className="text-button"
                    disabled={apiBusy}
                    onClick={() => validate(o.id, "reject")}
                  >
                    Refuser
                  </button>
                )}
              </>
            )}
          </div>
        ))
      ) : (
        <div className="empty">Aucune opération à afficher.</div>
      )}
    </div>
  );
}
