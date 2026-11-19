import React from "react";
import { Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import { useApp } from "./context/AppContext";
import PublicLayout from "./layouts/PublicLayout";
import DashboardLayout from "./layouts/DashboardLayout";
import Contact from "./pages/Contact";
import Accueil from "./pages/Accueil";
import TableauDeBord from "./pages/client/TableauDeBord";
import Transfert from "./pages/client/Transfert";
import Depot from "./pages/client/Depot";
import Retrait from "./pages/client/Retrait";
import Historique from "./pages/client/Historique";
import Operations from "./pages/admin/Operations";
import Profil from "./pages/client/Profil";
import Parametres from "./pages/admin/Parametres";
import TableauDeBordAdmin from "./pages/admin/TableauDeBordAdmin";
import Clients from "./pages/admin/Clients";
import Connexion from "./pages/Connexion";
import Inscription from "./pages/Inscription";
import ReinitialiserMotDePasse from "./pages/ReinitialiserMotDePasse";
import MotDePasseOublie from "./pages/MotDePasseOublie";
function RequireSession({ role }) {
  const { session, authLoading } = useApp();
  const location = useLocation();
  if (authLoading)
    return (
      <main className="empty" role="status">
        Vérification de la session…
      </main>
    );
  if (!session)
    return (
      <Navigate
        to="/connexion"
        state={{
          from: location.pathname,
          role,
        }}
        replace
      />
    );
  if (session !== role)
    return (
      <Navigate to={session === "admin" ? "/admin" : "/dashboard"} replace />
    );
  return <Outlet />;
}
export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/accueil" replace />} />
      <Route element={<PublicLayout />}>
        <Route path="/accueil" element={<Accueil />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/connexion" element={<Connexion />} />
        <Route path="/inscription" element={<Inscription />} />
        <Route path="/oublie" element={<MotDePasseOublie />} />
        <Route path="/reinitialiser" element={<ReinitialiserMotDePasse />} />
      </Route>
      <Route element={<RequireSession role="client" />}>
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<TableauDeBord />} />
          <Route path="/transfert" element={<Transfert />} />
          <Route path="/depot" element={<Depot />} />
          <Route path="/retrait" element={<Retrait />} />
          <Route path="/historique" element={<Historique />} />
          <Route path="/profil" element={<Profil />} />
        </Route>
      </Route>
      <Route element={<RequireSession role="admin" />}>
        <Route element={<DashboardLayout />}>
          <Route path="/operations" element={<Operations />} />
          <Route path="/parametres" element={<Parametres />} />
          <Route path="/admin" element={<TableauDeBordAdmin />} />
          <Route path="/clients" element={<Clients />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/accueil" replace />} />
    </Routes>
  );
}
