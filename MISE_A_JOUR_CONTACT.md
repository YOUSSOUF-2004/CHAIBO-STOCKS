# Ajouter le formulaire Contact et WhatsApp au projet existant

Cette archive contient le projet complet à jour et le workflow GitHub. Votre ordinateur n’est pas modifié automatiquement par le téléchargement.

1. Sauvegardez votre dossier de projet et vos modifications personnelles.
2. Copiez les fichiers de cette version dans votre dossier `chaibo-stock` existant. **Conservez votre `backend/.env`, votre `.env` racine si présent et vos données Docker/PostgreSQL.** L’archive ne contient aucun fichier de secrets ni aucune base.
3. Gardez Docker Desktop ouvert, démarrez PostgreSQL si nécessaire, puis appliquez la nouvelle migration depuis la racine du projet :

```powershell
docker compose --env-file backend/.env up -d --wait db
backend\.venv\Scripts\python.exe backend\manage.py migrate
```

4. Redémarrez Django et React dans deux terminaux :

```powershell
backend\.venv\Scripts\python.exe backend\manage.py runserver 127.0.0.1:8000
```

```powershell
npm.cmd run dev
```

Si un serveur est déjà démarré dans un terminal, arrêtez-le avec Ctrl+C avant de le relancer. Aucune nouvelle dépendance n’est ajoutée par cette fonctionnalité.

5. Ouvrez **http://localhost:5173/#/contact**. Le menu Contact et les liens de support de l’espace client y donnent aussi accès.
6. Pour lire les demandes, ouvrez **http://localhost:5173/admin/** avec votre compte superutilisateur, puis **Messages de contact**. Vous pouvez modifier le statut et ajouter des notes internes. Ces notes ne sont pas exposées aux visiteurs.

## Ce que fait le formulaire

Le nom, l’e-mail, le sujet et le message sont enregistrés dans PostgreSQL. Un numéro de référence est retourné au visiteur. Une nouvelle tentative identique conserve le même identifiant et ne crée pas de doublon. Le formulaire est accessible sans connexion, protégé par CSRF et limité à cinq requêtes par heure et par adresse réseau. Aucun mot de passe ni document bancaire ne doit y être transmis.

Une notification est ensuite remise au service d’e-mail configuré. Si SMTP échoue, le message reste enregistré et consultable dans l’administration. En développement, `EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend` affiche la notification dans le terminal Django ; **cela n’envoie pas un véritable e-mail**. La colonne « Notification traitée par le service e-mail » signale que ce service a accepté le message, pas que le destinataire l’a lu.

Pour un envoi réel, configurez SMTP dans `backend/.env` et définissez le destinataire :

```dotenv
SUPPORT_EMAIL=youssoufchaiboabakaradam@gmail.com
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.votre-fournisseur.com
EMAIL_PORT=587
EMAIL_USE_TLS=1
EMAIL_HOST_USER=votre-identifiant-smtp
EMAIL_HOST_PASSWORD=votre-secret-smtp
DEFAULT_FROM_EMAIL=CHAIBO STOCK <adresse-expediteur-autorisee@votre-domaine.com>
```

Utilisez les paramètres donnés par votre fournisseur. Ne publiez jamais ces secrets sur GitHub. Le service utilise l’adresse autorisée comme expéditeur et l’e-mail du visiteur comme adresse de réponse (`Reply-To`). Répondez depuis votre messagerie ; changer le statut dans Django Admin n’envoie pas de réponse au client.

## WhatsApp et liens de contact

Le bouton ouvre une conversation avec **+235 66 00 96 95**, avec un texte prérempli. L’utilisateur choisit ensuite de l’envoyer. Le numéro doit être associé à WhatsApp.

Les valeurs par défaut sont dans `src/services/support.js`. Vous pouvez les remplacer dans le `.env` racine :

```dotenv
VITE_SUPPORT_EMAIL=youssoufchaiboabakaradam@gmail.com
VITE_SUPPORT_WHATSAPP=23566009695
```

Redémarrez Vite (ou recompilez en production) après modification. Pour la production GitHub Actions, ces valeurs doivent être définies lors de la compilation du frontend ; le fichier serveur `production.env` sert au backend et n’affecte pas le frontend déjà compilé.

## Mode démonstration

Sur le site statique de démonstration, le formulaire est désactivé et ne prétend pas transmettre de demande. WhatsApp et le lien e-mail fonctionnent. L’enregistrement des messages exige votre backend Django démarré.

## Fichiers principaux

- `src/pages/Contact.jsx` : formulaire et confirmation.
- `src/services/support.js` : coordonnées de support.
- `src/layouts/PublicLayout.jsx` et `DashboardLayout.jsx` : liens Contact et WhatsApp.
- `backend/core/models.py` et `migrations/0003_contactmessage.py` : stockage des messages.
- `backend/core/views.py`, `serializers.py`, `contact.py` : validation et notification.
- `backend/core/admin.py` : lecture, statut et notes internes.

Les tests sont inclus dans `backend/core/test_contact.py` et `scripts/test-contact.mjs`.
