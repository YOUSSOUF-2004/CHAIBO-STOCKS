import { API_MODE } from "../services/api";
import React from "react";
import {
  ArrowUpRight,
  ShieldCheck,
  Bell,
  LogOut,
  ChevronRight,
  Menu,
  Headphones,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import Avatar from "../components/Avatar";
import { WHATSAPP_URL } from "../services/support";
import Logo from "../components/Logo";
import { Link, Outlet } from "react-router-dom";
export default function DashboardLayout() {
  const {
    page,
    session,
    setSession,
    profile,
    mobile,
    setMobile,
    go,
    notify,
    nav,
    adminNav,
  } = useApp();
  const { logout, apiBusy } = useApp();
  return (
    <div className="app-layout">
      <aside className={mobile ? "sidebar open" : "sidebar"}>
        <Link to="/accueil">
          <Logo />
        </Link>
        <div className="workspace-label">
          {session === "admin"
            ? "ESPACE ADMINISTRATEUR"
            : "MON ESPACE PERSONNEL"}
        </div>
        <nav>
          {(session === "admin" ? adminNav : nav).map(([id, label, Icon]) => (
            <button
              key={id}
              className={page === id ? "navitem selected" : "navitem"}
              onClick={() => go(id)}
            >
              <Icon size={20} />
              {label}
              {page === id && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="help-box">
            <Headphones />
            <b>Besoin d’aide ?</b>
            <p>Notre équipe vous accompagne.</p>
            <Link to="/contact">
              Contacter le support <ArrowUpRight size={14} />
            </Link>
            <a
              className="support-whatsapp"
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              WhatsApp
            </a>
          </div>
          <button
            className="navitem"
            onClick={() => {
              if (API_MODE) {
                logout();
                return;
              }
              setSession(null);
              go("connexion");
            }}
          >
            <LogOut size={18} />
            Se déconnecter
          </button>
          <span className="sidebar-version">
            CHAIBO STOCK · {API_MODE ? "Espace sécurisé" : "Démonstration"}
          </span>
        </div>
      </aside>
      <div className="app-main">
        <header className="app-top">
          <button
            className="mobile-toggle"
            onClick={() => setMobile(!mobile)}
            aria-label="Menu"
          >
            <Menu />
          </button>
          <span className="breadcrumb">
            Espace {session === "admin" ? "administrateur" : "client"}{" "}
            <ChevronRight size={14} />{" "}
            <b>
              {(session === "admin" ? adminNav : nav).find(
                (n) => n[0] === page,
              )?.[1] || "Opération"}
            </b>
          </span>
          <div className="top-right">
            <span className="demo-tag">
              {API_MODE ? "Compte connecté" : "Mode démo"}
            </span>
            <button
              className="bell"
              aria-label="Notifications"
              onClick={() =>
                notify("Vous êtes à jour. Aucune nouvelle notification.")
              }
            >
              <Bell size={20} />
              <i />
            </button>
            <button
              className="avatar-button"
              aria-label="Ouvrir mon profil"
              onClick={() => go(session === "admin" ? "parametres" : "profil")}
            >
              <Avatar profile={profile} />
            </button>
          </div>
        </header>
        <main className="app-content">
          <Outlet />
        </main>
        <footer className="app-footer">
          © 2026 CHAIBO STOCK{" "}
          <span>
            <ShieldCheck size={14} />
            Votre espace de confiance
          </span>
        </footer>
      </div>
    </div>
  );
}
