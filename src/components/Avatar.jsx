import React from "react";
import { PHOTOS_ENABLED } from "../services/features";
export default function Avatar({ profile, className = "user-avatar" }) {
  const initials = (profile.name || "Utilisateur")
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span className={className}>
      {PHOTOS_ENABLED && profile.photo ? (
        <img
          className="avatar-photo"
          src={profile.photo}
          alt={`Photo de profil de ${profile.name || "l’utilisateur"}`}
        />
      ) : (
        initials
      )}
    </span>
  );
}
