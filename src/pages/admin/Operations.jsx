import React from "react";
import { Download, Search } from "lucide-react";
import { useApp } from "../../context/AppContext";
import Transactions from "../../components/Transactions";
export default function Operations() {
  const { filter, setFilter, query, setQuery, exportCsv } = useApp();
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">TOUS VOS MOUVEMENTS</span>
          <h1>{"Toutes les opérations"}</h1>
          <p>Retrouvez et suivez chaque transaction.</p>
        </div>
        <button className="btn secondary" onClick={exportCsv}>
          <Download size={17} />
          Exporter CSV
        </button>
      </div>
      <section className="panel">
        <div className="history-tools">
          <div className="tabs">
            {["Tous", "Dépôt", "Retrait", "Transfert"].map((f) => (
              <button
                className={filter === f ? "active" : ""}
                key={f}
                onClick={() => setFilter(f)}
              >
                {f === "Tous" ? f : f + "s"}
              </button>
            ))}
          </div>
          <div className="search">
            <Search size={18} />
            <input
              placeholder="Rechercher une opération…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
        <Transactions />
      </section>
    </>
  );
}
