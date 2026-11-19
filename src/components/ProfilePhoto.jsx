import React, { useId, useRef, useState } from "react";
import { Camera, Trash2 } from "lucide-react";
import { useApp } from "../context/AppContext";
import { prepareProfilePhoto } from "../utils/profilePhoto";
import Avatar from "./Avatar";
import { PHOTOS_ENABLED } from "../services/features";

export default function ProfilePhoto() {
  const { profile, setProfile, persist, notify, apiMode, savePhoto } = useApp();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const input = useRef(null);
  const latestProfile = useRef(profile);
  latestProfile.current = profile;
  const mounted = useRef(true);
  React.useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const id = useId();
  function save(photo) {
    const next = { ...latestProfile.current, photo };
    // Persist before changing the UI so storage failure cannot look like success.
    persist("profile", next);
    setProfile(next);
  }
  async function selectPhoto(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    setBusy(true);
    try {
      if (apiMode) {
        await savePhoto(file);
        notify("Votre photo de profil a été enregistrée sur le serveur.");
        return;
      }
      const photo = await prepareProfilePhoto(file);
      if (!mounted.current) return;
      try {
        save(photo);
      } catch {
        throw new Error(
          "Impossible d’enregistrer la photo. L’espace de stockage du navigateur est peut-être plein.",
        );
      }
      notify("Votre photo de profil a été enregistrée.");
    } catch (cause) {
      setError(cause.message || "Impossible de charger cette photo.");
    } finally {
      if (mounted.current) setBusy(false);
    }
  }
  async function removePhoto() {
    setError("");
    try {
      if (apiMode) {
        await savePhoto(null);
        notify("Votre photo de profil a été supprimée.");
        return;
      }
      save("");
      notify("Votre photo de profil a été supprimée.");
    } catch {
      setError("Impossible d’enregistrer la suppression. Réessayez.");
    }
  }
  if (!PHOTOS_ENABLED) return (
    <div className="profile-photo-editor">
      <Avatar profile={profile} className="big-avatar" />
      <small className="photo-help">L’ajout de photos est temporairement indisponible.</small>
    </div>
  );
  return (
    <div className="profile-photo-editor">
      <Avatar profile={profile} className="big-avatar" />
      <input
        ref={input}
        id={id}
        className="photo-file-input"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        aria-label="Choisir une photo de profil"
        aria-describedby={`${id}-help`}
        disabled={busy}
        onChange={selectPhoto}
      />
      <button
        type="button"
        className="btn secondary photo-choose"
        disabled={busy}
        onClick={() => input.current?.click()}
      >
        <Camera size={16} />
        {busy
          ? "Préparation…"
          : profile.photo
            ? "Changer la photo"
            : "Ajouter une photo"}
      </button>
      {profile.photo && (
        <button
          type="button"
          className="photo-remove"
          disabled={busy}
          onClick={removePhoto}
        >
          <Trash2 size={13} />
          Supprimer la photo
        </button>
      )}
      <small id={`${id}-help`} className="photo-help">
        JPG, PNG ou WebP · 5 Mo maximum.
        <br />
        {apiMode
          ? "Enregistrée sur votre compte serveur."
          : "Enregistrée automatiquement dans ce navigateur."}
      </small>
      {error && (
        <p className="error photo-error" role="alert">
          {error}
        </p>
      )}
      <span className="photo-sr-status" role="status">
        {busy ? "Préparation de la photo en cours." : ""}
      </span>
    </div>
  );
}
