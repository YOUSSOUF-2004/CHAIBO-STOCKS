import { API_MODE } from "../services/api";
import React from "react";
import { ArrowUpRight, ShieldCheck, User, Menu } from "lucide-react";
import { useApp } from "../context/AppContext";
import Logo from "../components/Logo";
import { Link, Outlet } from "react-router-dom";
export default function PublicLayout() {
  const { setSession, mobile, setMobile, setRole, go, active } = useApp();
  return (
    <>
      <header className="site-header">
        <Link to="/accueil">
          <Logo />
        </Link>
        <nav className={mobile ? "site-nav open" : "site-nav"}>
          {[
            ["accueil", "Accueil"],
            ["services", "Nos services"],
            ["fonctionnement", "Comment ça marche"],
            ["contact", "Contact"],
          ].map(([id, label]) => (
            <a
              className={active && id === "accueil" ? "active" : ""}
              key={id}
              href={id === "accueil" ? "#accueil" : "#" + id}
              onClick={(e) => {
                e.preventDefault();
                if (!active) {
                  go("accueil");
                  setTimeout(
                    () =>
                      document.getElementById(id)?.scrollIntoView({
                        behavior: "smooth",
                      }),
                    50,
                  );
                } else
                  document.getElementById(id)?.scrollIntoView({
                    behavior: "smooth",
                  });
                setMobile(false);
              }}
            >
              {label}
            </a>
          ))}
        </nav>
        <div className="header-actions">
          <button className="login-link" onClick={() => go("connexion")}>
            <User size={17} />
            Connexion
          </button>
          <button
            className="btn yellow small"
            onClick={() => go("inscription")}
          >
            Créer un compte <ArrowUpRight size={16} />
          </button>
          <button
            className="mobile-toggle"
            onClick={() => setMobile(!mobile)}
            aria-label="Menu"
          >
            <Menu />
          </button>
        </div>
      </header>
      <Outlet />
      <footer className="site-footer" id="contact">
        <div className="footer-top">
          <div>
            <Logo />
            <p>
              Votre solution de gestion de compte
              <br />
              et de transfert d’argent.
            </p>
          </div>
          <div>
            <b>Explorer</b>
            <a
              href="#/accueil"
              onClick={(e) => {
                e.preventDefault();
                go("accueil");
                setTimeout(
                  () =>
                    document.getElementById("services")?.scrollIntoView({
                      behavior: "smooth",
                    }),
                  50,
                );
              }}
            >
              Nos services
            </a>
            <button
              onClick={() => {
                if (API_MODE) {
                  go("connexion");
                  return;
                }
                setSession("client");
                go("dashboard");
              }}
            >
              Espace client
            </button>
            <button
              onClick={() => {
                setRole("admin");
                go("connexion");
              }}
            >
              Espace administrateur
            </button>
          </div>
          <div>
            <b>Restons en contact</b>
            <a href="mailto:support@chaibo-stock.com">
              support@chaibo-stock.com
            </a>
           <a href="mailto:youssoufchaiboabakaradam@gmail.com">
               youssoufchaiboabakaradam@gmail.com
           </a>
            <a href="tel:+23566112233">+235 66 00 96 95</a>
            <span>N’Djaména, Abéche , Tchad</span>
          </div>
          <div className="footer-message">
            <ShieldCheck size={28} />
            <b>
              La confiance commence
              <br />
              par la simplicité.
            </b>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 CHAIBO STOCK. Tous droits réservés.</span>
          <span>Réaliser par ing. YOUSSOUF CHAIBO</span>
        </div>
      </footer>
    </>
  );
}
