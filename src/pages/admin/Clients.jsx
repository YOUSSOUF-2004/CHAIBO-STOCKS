import { API_MODE } from "../../services/api";
import React from "react";
import { Plus, Search } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { money } from "../../utils/format";
export default function Clients() {
  const { clients, setClients, query, setQuery, setModal, notify, persist } =
    useApp();
  const { toggleClient, apiBusy } = useApp();
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">ADMINISTRATION</span>
          <h1>Gestion des clients</h1>
          <p>
            {clients.length} clients{" "}
            {API_MODE
              ? "enregistrés sur le serveur."
              : "dans votre espace de démonstration."}
          </p>
        </div>
        <button
          className="btn"
          onClick={() =>
            setModal({
              type: "client",
            })
          }
        >
          <Plus size={18} />
          Ajouter un client
        </button>
      </div>
      <section className="panel">
        <div className="history-tools">
          <h3>Répertoire clients</h3>
          <div className="search">
            <Search size={18} />
            <input
              placeholder="Rechercher un client…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="client-table">
          <div className="table-head">
            <span>CLIENT</span>
            <span>SOLDE</span>
            <span>STATUT</span>
            <span>ACTION</span>
          </div>
          {clients
            .filter((c) =>
              (c.name + c.phone).toLowerCase().includes(query.toLowerCase()),
            )
            .map((c, i) => (
              <div className="client-row" key={c.phone}>
                <div>
                  <span className="user-avatar">
                    {c.name
                      .split(" ")
                      .map((s) => s[0])
                      .join("")}
                  </span>
                  <span>
                    <b>{c.name}</b>
                    <small>{c.phone}</small>
                  </span>
                </div>
                <b>{money(c.balance)}</b>
                <span className={"status " + (!c.active ? "suspended" : "")}>
                  {c.active ? "Actif" : "Suspendu"}
                </span>
                <button
                  className="text-button"
                  onClick={() => {
                    if (API_MODE) {
                      toggleClient(c);
                      return;
                    }
                    let next = clients.map((x) =>
                      x.phone === c.phone
                        ? {
                            ...x,
                            active: !x.active,
                          }
                        : x,
                    );
                    setClients(next);
                    persist("clients", next);
                    notify("Statut du client mis à jour.");
                  }}
                >
                  {c.active ? "Suspendre" : "Activer"}
                </button>
              </div>
            ))}
        </div>
      </section>
    </>
  );
}
