import { useState, useEffect } from "react";
import {
  api,
  listAll,
  adaptUser,
  adaptOperation,
  API_MODE,
} from "../services/api";
export default function useBackendApi({
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
}) {
  const [loading, setLoading] = useState(API_MODE);
  const [busy, setBusy] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  useEffect(() => {
    if (location.pathname === "/connexion") setLoggingOut(false);
  }, [location.pathname]);
  const [connectionError, setConnectionError] = useState("");
  function apply(user) {
    const profile = adaptUser(user);
    setProfile(profile);
    setBalance(profile.balance);
    setSession(profile.role);
    return profile;
  }
  async function refresh(user) {
    const profile = apply(user || (await api("me/")));
    const [ops, clients] = await Promise.all([
      listAll("operations/"),
      profile.role === "admin"
        ? listAll("admin/clients/")
        : Promise.resolve([]),
    ]);
    setOperations(ops.map(adaptOperation));
    setClients(clients.map(adaptUser));
    return profile;
  }
  useEffect(() => {
    if (!API_MODE) return;
    let mounted = true;
    (async () => {
      try {
        const current = await api("session/");
        if (!mounted) return;
        if (current.authenticated) await refresh(current.user);
        else setSession(null);
        setConnectionError("");
      } catch (error) {
        if (mounted) {
          setConnectionError(error.message);
          setSession(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);
  async function authenticate(path, data) {
    setBusy(true);
    setError("");
    try {
      const user = await api(path, { method: "POST", data });
      await refresh(user);
      const target =
        location.state?.role === user.role ? location.state.from : null;
      go(
        target
          ? target.replace(/^\//, "")
          : user.role === "admin"
            ? "admin"
            : "dashboard",
      );
      setConnectionError("");
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  async function login(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    return authenticate("auth/login/", {
      phone: form.get("phone"),
      password: form.get("password"),
    });
  }
  async function register(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (form.get("password") !== form.get("confirm")) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    return authenticate("auth/register/", {
      name: form.get("name"),
      phone: form.get("phone"),
      email: form.get("email") || "",
      password: form.get("password"),
    });
  }
  async function logout() {
    setBusy(true);
    setLoggingOut(true);
    try {
      await api("auth/logout/", { method: "POST" });
      go("connexion");
      setSession(null);
      setProfile({ name: "", phone: "", email: "", photo: "" });
      setBalance(0);
      setOperations([]);
      setClients([]);
    } catch (error) {
      setLoggingOut(false);
      notify(error.message);
    } finally {
      setBusy(false);
    }
  }
  async function confirm() {
    let recorded = false;
    setBusy(true);
    setError("");
    try {
      await api("operations/", {
        method: "POST",
        data: {
          kind:
            modal.type === "Dépôt"
              ? "deposit"
              : modal.type === "Retrait"
                ? "withdrawal"
                : "transfer",
          amount: String(modal.n),
          idempotency_key: modal.key,
          reference: modal.reference || "",
          ...(modal.type === "Transfert"
            ? { recipient_phone: modal.phone }
            : {}),
        },
      });
      recorded = true;
      setModal(null);
      await refresh();
      go("historique");
      notify(
        modal.type === "Dépôt"
          ? "Demande de dépôt envoyée pour validation."
          : "Opération enregistrée.",
      );
    } catch (error) {
      if (recorded) {
        go("historique");
        notify(
          "Opération enregistrée. L’actualisation a échoué ; rechargez la page pour consulter le solde.",
        );
      } else setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  async function validate(id, decision = "approve") {
    setBusy(true);
    try {
      await api(`admin/deposits/${id}/decision/`, {
        method: "POST",
        data: { decision },
      });
      await refresh();
      notify(decision === "approve" ? "Dépôt validé." : "Dépôt refusé.");
    } catch (error) {
      notify(error.message);
    } finally {
      setBusy(false);
    }
  }
  async function saveProfile(data) {
    const user = await api("me/", {
      method: "PATCH",
      data: { name: data.name, email: data.email || "" },
    });
    apply(user);
    notify("Vos informations ont été enregistrées.");
  }
  async function savePhoto(file) {
    let data;
    if (file) {
      data = new FormData();
      data.append("photo", file);
    } else data = { remove_photo: true };
    const user = await api("me/", { method: "PATCH", data });
    apply(user);
  }
  async function toggleClient(client) {
    setBusy(true);
    try {
      await api(`admin/clients/${client.id}/`, {
        method: "PATCH",
        data: { active: !client.active },
      });
      await refresh();
      notify("Statut du client enregistré.");
    } catch (error) {
      notify(error.message);
    } finally {
      setBusy(false);
    }
  }
  async function addClient(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      await api("admin/clients/", {
        method: "POST",
        data: {
          name: form.get("name"),
          phone: form.get("phone"),
          email: form.get("email") || "",
          password: form.get("password"),
        },
      });
      setModal(null);
      await refresh();
      notify(
        "Compte client créé. Le mot de passe peut être réinitialisé par e-mail.",
      );
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  return {
    loading: loading || loggingOut,
    busy,
    connectionError,
    login,
    register,
    logout,
    confirm,
    validate,
    saveProfile,
    savePhoto,
    toggleClient,
    addClient,
    refresh,
  };
}
