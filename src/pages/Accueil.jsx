import { API_MODE } from "../services/api";
import React from "react";
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
  User,
  LayoutDashboard,
  History,
  Eye,
  Check,
  Smartphone,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { initial } from "../data/demo";
export default function Accueil() {
  const { setSession, go, actions } = useApp();
  return (
    <>
      <section className="hero" id="accueil">
        <div className="hero-inner">
          <div className="hero-copy">
            <span className="hero-kicker">
              <span /> VOTRE ARGENT, EN TOUTE CONFIANCE
            </span>
            <h1>
              Votre compte.
              <br />
              Vos projets.
              <br />
              <em>En toute simplicité.</em>
            </h1>
            <p>
              Gérez votre solde, vos dépôts et vos transferts.
              <br className="desktop" /> Un espace clair pour avancer au
              quotidien.
            </p>
            <div className="hero-buttons">
              <button className="btn yellow" onClick={() => go("inscription")}>
                Ouvrir mon compte <ArrowUpRight size={21} />
              </button>
              <button
                className="btn outline"
                onClick={() => {
                  if (API_MODE) {
                    go("connexion");
                    return;
                  }
                  setSession("client");
                  go("dashboard");
                }}
              >
                {API_MODE ? "Découvrir mon espace" : "Découvrir la démo"}{" "}
                <ArrowRight size={18} />
              </button>
            </div>
            <div className="hero-assurance">
              <span>
                <ShieldCheck size={17} />
                Sécurité renforcée
              </span>
              <i />
              <span>
                <Zap size={17} />
                Opérations rapides
              </span>
            </div>
          </div>
          <div className="hero-visual">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <span className="floating-tag tag-top">
              <span className="icon-tile green">
                <ShieldCheck size={18} />
              </span>
              Vous êtes entre de bonnes mains
            </span>
            <div className="hero-phone">
              <div className="phone-notch" />
              <div className="phone-top">
                <span>9:41</span>
                <span>••• ▰</span>
              </div>
              <div className="phone-user">
                <div>
                  <small>Bonjour,</small>
                  <b>
                    Adam Youssouf <span>✦</span>
                  </b>
                </div>
                <span className="phone-avatar">
                  <User size={20} />
                </span>
              </div>
              <div className="phone-balance">
                <span>
                  Solde disponible <Eye size={14} />
                </span>
                <b>
                  125 000 <small>FCFA</small>
                </b>
                <small>
                  <span className="live-dot" /> Votre compte est à jour
                </small>
              </div>
              <div className="phone-actions">
                {actions.map(([id, label, Icon, color]) => (
                  <button
                    key={id}
                    onClick={() => {
                      if (API_MODE) {
                        go("connexion");
                        return;
                      }
                      setSession("client");
                      go(id);
                    }}
                  >
                    <span className={"icon-tile " + color}>
                      <Icon size={20} />
                    </span>
                    {label}
                  </button>
                ))}
              </div>
              <div className="phone-list-heading">
                Dernières opérations <span>Tout voir</span>
              </div>
              {initial.slice(0, 3).map((o) => (
                <div className="phone-operation" key={o.id}>
                  <span
                    className={
                      "icon-tile " + (o.type === "Dépôt" ? "green" : "purple")
                    }
                  >
                    {o.type === "Dépôt" ? (
                      <ArrowDownLeft size={17} />
                    ) : (
                      <ArrowUpRight size={17} />
                    )}
                  </span>
                  <div>
                    <b>{o.type}</b>
                    <small>Aujourd’hui, 09:20</small>
                  </div>
                  <b className={o.type === "Dépôt" ? "positive" : ""}>
                    {o.type === "Dépôt" ? "+" : "−"}
                    {o.amount.toLocaleString("fr-FR")}
                  </b>
                </div>
              ))}
              <div className="phone-bottom">
                <LayoutDashboard />
                <ArrowLeftRight />
                <User />
              </div>
            </div>
            <div className="floating-tag tag-bottom">
              <span className="check-round">
                <Check size={20} />
              </span>
              <div>
                <b>Transfert effectué !</b>
                <small>Simple. Rapide. Sans détour.</small>
              </div>
              <span className="tag-amount">
                20 000 <small>FCFA</small>
              </span>
            </div>
            <span className="visual-caption">
              <span /> VOTRE QUOTIDIEN, PLUS LÉGER
            </span>
          </div>
        </div>
        <div className="hero-bottom-line">
          <span>UN SEUL ESPACE. TOUTES VOS OPÉRATIONS.</span>
          <div>
            <span>01 /</span> PENSÉ POUR VOUS <ArrowDownLeft size={16} />
          </div>
        </div>
      </section>
      <section className="benefit-strip">
        <div>
          <Wallet />
          <span>
            <b>Votre solde, en un regard</b>
            <small>Gardez le contrôle de votre compte</small>
          </span>
        </div>
        <div>
          <ArrowLeftRight />
          <span>
            <b>Des transferts simplifiés</b>
            <small>Envoyez de l’argent en quelques clics</small>
          </span>
        </div>
        <div>
          <Clock />
          <span>
            <b>Chaque opération, suivie</b>
            <small>Un historique clair et accessible</small>
          </span>
        </div>
      </section>
      <section className="services section" id="services">
        <div className="section-heading">
          <div>
            <span className="eyebrow">L’ESSENTIEL, SANS COMPLICATION</span>
            <h2>
              Tout ce dont vous avez besoin.
              <br />
              <span>Au même endroit.</span>
            </h2>
          </div>
          <p>
            Du premier dépôt au prochain transfert,
            <br />
            CHAIBO STOCK vous accompagne.
          </p>
        </div>
        <div className="service-grid">
          {[
            [
              Wallet,
              "Votre compte, votre liberté",
              "Consultez votre solde et retrouvez toutes vos informations dans un espace personnel.",
              "blue",
              "dashboard",
            ],
            [
              ArrowLeftRight,
              "L’argent circule simplement",
              "Envoyez de l’argent à vos proches en renseignant leurs coordonnées.",
              "green",
              "transfert",
            ],
            [
              Download,
              "Déposez. Retirez. Avancez.",
              "Préparez vos dépôts et vos retraits, puis suivez leur statut en toute clarté.",
              "orange",
              "depot",
            ],
            [
              History,
              "Rien ne vous échappe",
              "Retrouvez vos mouvements et exportez votre historique quand vous le souhaitez.",
              "purple",
              "historique",
            ],
          ].map(([Icon, title, desc, color, id], i) => (
            <button
              className="service-card"
              key={id}
              onClick={() => {
                if (API_MODE) {
                  go("connexion");
                  return;
                }
                setSession("client");
                go(id);
              }}
            >
              <div className="service-card-top">
                <span className={"icon-tile " + color}>
                  <Icon size={25} />
                </span>
                <span>0{i + 1}</span>
              </div>
              <h3>{title}</h3>
              <p>{desc}</p>
              <span className="service-link">
                Explorer <ArrowUpRight size={19} />
              </span>
            </button>
          ))}
        </div>
      </section>
      <section className="how-section section" id="fonctionnement">
        <div className="section-heading">
          <div>
            <span className="eyebrow">C’EST SIMPLE DE COMMENCER</span>
            <h2>
              Trois étapes.
              <br />
              Et vous voilà prêt.
            </h2>
          </div>
          <button className="btn yellow" onClick={() => go("inscription")}>
            C’est parti <ArrowUpRight size={18} />
          </button>
        </div>
        <div className="steps">
          {[
            [
              "01",
              "Créez votre compte",
              "Quelques informations suffisent pour découvrir votre espace.",
            ],
            [
              "02",
              "Effectuez vos opérations",
              "Dépôt, retrait ou transfert : choisissez ce dont vous avez besoin.",
            ],
            [
              "03",
              "Gardez une longueur d’avance",
              "Consultez votre solde et votre historique à tout moment.",
            ],
          ].map(([n, t, p]) => (
            <div key={n}>
              <span>{n}</span>
              <h3>{t}</h3>
              <p>{p}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="cta section">
        <div className="cta-icon">
          <Smartphone size={48} />
        </div>
        <div>
          <span className="eyebrow">VOTRE COMPTE VOUS SUIT</span>
          <h2>
            À votre rythme.
            <br />
            Sur tous vos écrans.
          </h2>
          <p>
            Une interface adaptée à votre téléphone, tablette et ordinateur.
          </p>
        </div>
        <button
          className="btn"
          onClick={() => {
            if (API_MODE) {
              go("connexion");
              return;
            }
            setSession("client");
            go("dashboard");
          }}
        >
          Essayer CHAIBO STOCK <ArrowUpRight size={19} />
        </button>
      </section>
    </>
  );
}
