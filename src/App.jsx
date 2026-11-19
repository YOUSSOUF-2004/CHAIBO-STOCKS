import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  ArrowDownLeft,
  Wallet,
  ShieldCheck,
  Zap,
  Clock,
  ArrowLeftRight,
  Download,
  Upload,
  Send,
  Bell,
  User,
  LayoutDashboard,
  Users,
  History,
  Settings,
  LogOut,
  ChevronRight,
  Eye,
  EyeOff,
  Check,
  Plus,
  Search,
  Menu,
  X,
  Lock,
  Mail,
  Phone,
  Headphones,
  CheckCircle2,
  TrendingUp,
  Smartphone,
} from "lucide-react";
import { AppContext } from "./context/AppContext";
import AppRoutes from "./routes";
import { API_MODE } from "./services/api";
import useBackendApi from "./hooks/useBackendApi";
import { money } from "./utils/format";
import { initial } from "./data/demo";
function saved(k, d) {
  try {
    return JSON.parse(localStorage.getItem(k)) ?? d;
  } catch {
    return d;
  }
}
export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const page = location.pathname.slice(1) || "accueil";
  const [session, setSession] = useState(() => {
      try {
        return API_MODE
          ? null
          : JSON.parse(sessionStorage.getItem("chaibo-session"));
      } catch {
        return null;
      }
    }),
    [profile, setProfile] = useState(
      API_MODE
        ? { name: "", phone: "", email: "", photo: "" }
        : saved("chaibo-profile", {
            name: "Adam Youssouf",
            phone: "+235 66 11 22 33",
            email: "adam@exemple.com",
          }),
    ),
    [balance, setBalance] = useState(
      API_MODE ? 0 : saved("chaibo-balance", 125000),
    ),
    [operations, setOperations] = useState(
      API_MODE ? [] : saved("chaibo-ops", initial),
    ),
    [clients, setClients] = useState(
      API_MODE
        ? []
        : saved("chaibo-clients", [
            {
              name: "Moussa Ahmad",
              phone: "+235 66 01 02 03",
              balance: 250000,
              active: true,
            },
            {
              name: "Amina Saleh",
              phone: "+235 66 11 22 33",
              balance: 75000,
              active: true,
            },
            {
              name: "Issa Mahamat",
              phone: "+235 66 44 55 66",
              balance: 0,
              active: false,
            },
            {
              name: "Fatimé Adoum",
              phone: "+235 66 77 88 99",
              balance: 120000,
              active: true,
            },
          ]),
    ),
    [toast, setToast] = useState(""),
    [filter, setFilter] = useState("Tous"),
    [query, setQuery] = useState(""),
    [hidden, setHidden] = useState(false),
    [mobile, setMobile] = useState(false),
    [modal, setModal] = useState(null),
    [role, setRole] = useState("client"),
    [amount, setAmount] = useState(""),
    [error, setError] = useState("");
  React.useEffect(() => {
    if (!API_MODE)
      sessionStorage.setItem("chaibo-session", JSON.stringify(session));
  }, [session]);
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [page]);
  const backend = useBackendApi({
    setSession,
    setProfile,
    setBalance,
    setOperations,
    setClients,
    setModal,
    setError,
    go,
    notify,
    role,
    location,
    modal,
  });
  React.useEffect(() => {
    if (page === "connexion" && location.state?.role)
      setRole(location.state.role);
  }, [page, location.state]);
  function go(p) {
    navigate("/" + p, { state: null });
    window.scrollTo(0, 0);
    setMobile(false);
    setError("");
    setAmount("");
    setFilter("Tous");
    setQuery("");
  }
  function notify(s) {
    setToast(s);
    setTimeout(() => setToast(""), 4500);
  }
  function persist(k, v) {
    localStorage.setItem("chaibo-" + k, JSON.stringify(v));
  }
  function login(e) {
    e.preventDefault();
    setSession(role);
    const target = location.state?.role === role ? location.state?.from : null;
    go(
      target
        ? target.replace(/^\//, "")
        : role === "admin"
          ? "admin"
          : "dashboard",
    );
  }
  function transact(e) {
    e.preventDefault();
    let n = Number(amount),
      type =
        page === "transfert"
          ? "Transfert"
          : page === "retrait"
            ? "Retrait"
            : "Dépôt";
    if (!Number.isSafeInteger(n) || n <= 0) {
      setError("Saisissez un montant valide.");
      return;
    }
    if (type !== "Dépôt" && n > balance) {
      setError("Votre solde est insuffisant pour cette opération.");
      return;
    }
    let name = new FormData(e.currentTarget).get("beneficiaire");
    setModal({
      type,
      n,
      name,
      phone: new FormData(e.currentTarget).get("telephone"),
      reference: new FormData(e.currentTarget).get("reference") || "",
      key: API_MODE ? crypto.randomUUID() : null,
    });
  }
  function confirm() {
    let { type, n, name } = modal;
    let next = [
      {
        id: Date.now(),
        type,
        amount: n,
        date: new Date().toISOString(),
        name: type === "Transfert" ? "À " + name : type + " en agence",
        status: type === "Dépôt" ? "En attente" : "Validé",
      },
      ...operations,
    ];
    setOperations(next);
    persist("ops", next);
    if (type !== "Dépôt") {
      let b = balance - n;
      setBalance(b);
      persist("balance", b);
    }
    setModal(null);
    go("historique");
    notify(
      type === "Dépôt"
        ? "Demande de dépôt envoyée à l’administrateur."
        : "Opération effectuée avec succès.",
    );
  }
  function validate(id) {
    let next = operations.map((o) =>
      o.id === id
        ? {
            ...o,
            status: "Validé",
          }
        : o,
    );
    let op = operations.find((o) => o.id === id);
    setBalance(balance + op.amount);
    persist("balance", balance + op.amount);
    setOperations(next);
    persist("ops", next);
    notify("Dépôt validé et solde actualisé.");
  }
  function exportCsv() {
    let a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob(
        [
          "Date;Type;Montant FCFA;Statut\n" +
            operations
              .map((o) => `${o.date};${o.type};${o.amount};${o.status}`)
              .join("\n"),
        ],
        {
          type: "text/csv;charset=utf-8;",
        },
      ),
    );
    a.download = "chaibo-operations.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }
  let active = page === "accueil";
  const actions = [
    ["depot", "Dépôt", Download, "green"],
    ["retrait", "Retrait", Upload, "blue"],
    ["transfert", "Transfert", Send, "purple"],
  ];
  const nav = [
    ["dashboard", "Vue d’ensemble", LayoutDashboard],
    ["transfert", "Envoyer de l’argent", Send],
    ["depot", "Dépôt & retrait", ArrowLeftRight],
    ["historique", "Mes opérations", History],
    ["profil", "Mon profil", User],
  ];
  const adminNav = [
    ["admin", "Tableau de bord", LayoutDashboard],
    ["clients", "Gestion des clients", Users],
    ["operations", "Toutes les opérations", ArrowLeftRight],
    ["parametres", "Paramètres", Settings],
  ];
  return (
    <AppContext.Provider
      value={{
        page,
        session,
        setSession,
        profile,
        setProfile,
        balance,
        setBalance,
        operations,
        setOperations,
        clients,
        setClients,
        toast,
        setToast,
        filter,
        setFilter,
        query,
        setQuery,
        hidden,
        setHidden,
        mobile,
        setMobile,
        modal,
        setModal,
        role,
        setRole,
        amount,
        setAmount,
        error,
        setError,
        go,
        notify,
        persist,
        apiMode: API_MODE,
        authLoading: backend.loading,
        apiBusy: backend.busy,
        register: backend.register,
        logout: backend.logout,
        saveProfile: backend.saveProfile,
        savePhoto: backend.savePhoto,
        toggleClient: backend.toggleClient,
        login: API_MODE ? backend.login : login,
        transact,
        confirm: API_MODE ? backend.confirm : confirm,
        validate: API_MODE ? backend.validate : validate,
        exportCsv,
        actions,
        nav,
        adminNav,
        active,
      }}
    >
      <>
        {toast && (
          <div className="toast">
            <CheckCircle2 size={20} />
            {toast}
          </div>
        )}
        {modal && modal.type !== "client" && (
          <div className="overlay">
            <div className="modal">
              <button
                className="close"
                onClick={() => setModal(null)}
                aria-label="Fermer"
              >
                <X />
              </button>
              <span className="icon-tile blue">
                <ShieldCheck />
              </span>
              <h2>Confirmer le {modal.type.toLowerCase()}</h2>
              <p>Vérifiez les informations avant de continuer.</p>
              <div className="confirm-amount">{money(modal.n)}</div>
              {modal.name && (
                <p>
                  Destinataire : <b>{modal.name}</b>
                </p>
              )}
              <p className="muted">
                {modal.type === "Dépôt"
                  ? "Le dépôt sera soumis à la validation d’un agent."
                  : "Frais : 0 FCFA"}
              </p>
              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
              <button
                className="btn full"
                disabled={backend.busy}
                onClick={API_MODE ? backend.confirm : confirm}
              >
                Confirmer l’opération <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}
        {API_MODE && backend.connectionError && (
          <div className="api-banner" role="alert">
            {backend.connectionError} Démarrez le backend Django puis rechargez
            la page.
          </div>
        )}
        <AppRoutes />
        {modal?.type === "client" && (
          <div className="overlay">
            <form
              className="modal"
              onSubmit={(e) => {
                if (API_MODE) {
                  backend.addClient(e);
                  return;
                }
                e.preventDefault();
                let d = new FormData(e.currentTarget);
                if (clients.some((c) => c.phone === d.get("phone"))) {
                  notify("Ce numéro existe déjà.");
                  return;
                }
                let next = [
                  ...clients,
                  {
                    name: d.get("name"),
                    phone: d.get("phone"),
                    balance: 0,
                    active: true,
                  },
                ];
                setClients(next);
                persist("clients", next);
                setModal(null);
                notify("Client ajouté.");
              }}
            >
              <button
                type="button"
                className="close"
                onClick={() => setModal(null)}
                aria-label="Fermer"
              >
                <X />
              </button>
              <h2>Ajouter un client</h2>
              <label>
                Nom et prénoms
                <input name="name" required />
              </label>
              <label>
                Téléphone
                <input name="phone" type="tel" minLength={8} required />
              </label>
              {API_MODE && (
                <>
                  <label>
                    Adresse e-mail
                    <input type="email" name="email" required />
                  </label>
                  <label>
                    Mot de passe initial
                    <input
                      type="password"
                      name="password"
                      minLength={10}
                      required
                      autoComplete="new-password"
                    />
                  </label>
                  <p className="muted">
                    Transmettez ce mot de passe par un canal privé. Le client
                    peut le réinitialiser par e-mail.
                  </p>
                </>
              )}
              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
              <button
                className="btn full"
                type="submit"
                disabled={backend.busy}
              >
                Ajouter le client <Plus size={17} />
              </button>
            </form>
          </div>
        )}
      </>
    </AppContext.Provider>
  );
}
