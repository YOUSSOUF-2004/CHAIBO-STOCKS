import { API_MODE } from "../../services/api";
import React from "react";
import { Check, Lock, CheckCircle2 } from "lucide-react";
import { useApp } from "../../context/AppContext";
import ProfilePhoto from "../../components/ProfilePhoto";
export default function Profil() {
  const { profile, setProfile, notify, persist } = useApp();
  const { saveProfile } = useApp();
  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState("");
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">VOTRE ESPACE</span>
          <h1>{"Mon profil"}</h1>
          <p>Gérez vos informations personnelles.</p>
        </div>
      </div>
      <div className="profile-layout">
        <div className="panel profile-card">
          <ProfilePhoto />
          <h2>{profile.name}</h2>
          <p>{profile.phone}</p>
          <span className="status">
            <CheckCircle2 size={14} />
            {API_MODE ? "Compte actif" : "Compte démo actif"}
          </span>
          <div className="profile-note">
            <Lock size={20} />
            <p>
              {API_MODE
                ? "Votre profil est enregistré sur le serveur. Votre photo est accessible à vous et aux administrateurs autorisés."
                : "Vos données de démonstration sont conservées uniquement dans ce navigateur."}
            </p>
          </div>
        </div>
        <form
          className="panel profile-form"
          onSubmit={async (e) => {
            e.preventDefault();
            let data = {
              ...profile,
              ...Object.fromEntries(new FormData(e.currentTarget)),
            };
            if (API_MODE) {
              setSaving(true);
              setSaveError("");
              try {
                await saveProfile(data);
              } catch (error) {
                setSaveError(error.message);
              } finally {
                setSaving(false);
              }
              return;
            }
            persist("profile", data);
            setProfile(data);
            notify("Vos informations ont été mises à jour.");
          }}
        >
          <h3>Mes informations</h3>
          <label>
            Nom et prénoms
            <input name="name" defaultValue={profile.name} required />
          </label>
          <label>
            Numéro de téléphone
            <input
              name="phone"
              readOnly={API_MODE}
              type="tel"
              defaultValue={profile.phone}
              required
            />
          </label>
          <label>
            Adresse e-mail
            <input name="email" type="email" defaultValue={profile.email} />
          </label>
          {API_MODE && (
            <p className="muted">
              Votre numéro identifie le compte et ne peut pas être modifié ici.
            </p>
          )}
          {saveError && (
            <p className="error" role="alert">
              {saveError}
            </p>
          )}
          <button className="btn" type="submit" disabled={saving}>
            Enregistrer les modifications <Check size={17} />
          </button>
        </form>
      </div>
    </>
  );
}
