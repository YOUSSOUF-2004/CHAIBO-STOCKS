# Déployer CHAIBO STOCK sur Render Free + Supabase

Cette version fournit les adaptations Render. Elle ne crée pas vos comptes Render/Supabase/Brevo et ne transfère pas les données de votre PostgreSQL local.

## A. Mettre à jour le dépôt GitHub

Vous avez deux dossiers : le projet de travail et le clone GitHub. Les fichiers doivent être ajoutés au **clone GitHub** utilisé par Render, par exemple `C:\Users\youss\chaibo-stock-github`.

L’archive contient le projet complet et ses exemples de configuration. Sauvegardez vos modifications personnelles avant de copier cette version dans le clone. Conservez les fichiers `.env` locaux, qui ne sont pas inclus et ne doivent pas être publiés.

Les adaptations Render sont : `Dockerfile.render`, `.dockerignore`, `deploy/render-start.sh`, `deploy/render.env.example`, `backend/config/settings.py`, `backend/config/urls.py`, `backend/core/frontend.py`, `backend/core/apps.py`, `backend/core/db_signals.py`, `backend/core/email_backends.py`, `backend/core/management/`, et les deux fichiers `backend/requirements.*`. Les autres fichiers conservent l’application complète, dont le contact et les photos.

Dans le terminal du clone :

```cmd
git add .
git --no-pager diff --cached --name-only
git commit -m "Configuration Render et stockage Supabase"
git push origin main
```

Avant le commit, vérifier que seuls les `.env.example` et `render.env.example` sont sélectionnés, jamais un `.env` réel. Le workflow VPS `.github/workflows/deploy.yml` reste destiné à un VPS ; **ne configurez pas ses secrets VPS pour Render**. Pour utiliser uniquement Render, désactivez ce workflow dans GitHub Actions ou adaptez-le à une CI sans job SSH. Render déploie directement depuis GitHub.

## B. Créer le projet Supabase

1. Créer un compte sur https://supabase.com/dashboard et un projet **Free**.
2. Choisir une région proche du service Render (idéalement Europe/Frankfurt si proposée).
3. Définir un mot de passe PostgreSQL fort et le conserver dans un gestionnaire de mots de passe.
4. Ouvrir **Connect → Session pooler**. Utiliser l’hôte indiqué, le port **5432**, la base `postgres`, l’utilisateur `postgres.REFERENCE_PROJET` et le mot de passe choisi. Cette connexion fonctionne sur un réseau IPv4. Ne pas choisir le transaction pooler 6543 pour cette configuration.
5. Dans **Storage**, créer un bucket **`profile-photos`**, avec **Public désactivé**.
6. Dans les paramètres Storage / S3, créer une paire de clés S3. Conserver l’Access key ID et la Secret access key. Copier aussi l’endpoint S3 et la région fournis par Supabase.

Ces clés S3 sont privées : elles ne doivent jamais apparaître dans React, une variable `VITE_`, un fichier GitHub public ou une capture d’écran. Django les utilise pour servir la photo uniquement au propriétaire et à l’administrateur.

Au démarrage, Django crée ses tables dans le schéma **`chaibo_private`**, séparé du schéma public de Supabase. Ne pas ajouter ce schéma aux schémas exposés par la Data API Supabase et ne pas donner accès aux rôles `anon`/`authenticated`. La connexion utilise un rôle PostgreSQL pouvant créer ce schéma. L’authentification reste celle de Django ; Supabase Auth n’est pas utilisé.

## C. Configurer les e-mails

Render Free bloque les ports SMTP courants. La connexion Gmail SMTP utilisée en local ne convient donc pas à cette offre.

Créer un compte Brevo, faire valider l’expéditeur ou le domaine selon les exigences du fournisseur et générer une clé API transactionnelle. Dans Render, utiliser :

- `EMAIL_BACKEND=core.email_backends.BrevoEmailBackend`
- `BREVO_API_KEY` : clé API privée.
- `DEFAULT_FROM_EMAIL` : adresse d’expéditeur autorisée par Brevo, avec éventuellement `CHAIBO STOCK <adresse@domaine>`.
- `SUPPORT_EMAIL` : destinataire des demandes de support.

Le backend utilise HTTPS, sans SMTP. La réinitialisation du mot de passe et les notifications de contact utilisent ce même service. Aucun e-mail réel n’est envoyé lors de la préparation ou des tests du code ; l’envoi est déclenché par l’utilisation de votre application.

## D. Remplir le formulaire Render

Dans **New Web Service**, connecter `YOUSSOUF-2004/CHAIBO-STOCKS` :

| Champ | Valeur |
| --- | --- |
| Name | `chaibo-stocks` ou un nom disponible |
| Language | **Docker**, pas Node |
| Branch | `main` |
| Region | Choisir si possible la même zone que Supabase |
| Root Directory | **Laisser vide** |
| Dockerfile Path | **`./Dockerfile.render`** |
| Docker Build Context | `.` si demandé |
| Docker Command / commande de remplacement | **Laisser vide** |
| Compute | **Free — $0/month**, pas l’offre payante présélectionnée |
| Health Check Path, dans Advanced | **`/api/health/`** |

Les commandes `npm install && npm run build` et `yarn start` ne s’appliquent pas ici : elles sont remplacées par les instructions Docker. La compilation Node et le lancement Python sont inclus dans le Dockerfile. Les migrations, le schéma privé et les fichiers statiques sont préparés au démarrage du conteneur, sans dépendre d’un shell Render payant.

## E. Variables privées Render

Utiliser **Environment Variables → Add Environment Variable**, en prenant les NOMS dans `deploy/render.env.example` et les vraies valeurs depuis les services. Ne pas coller les valeurs d’exemple de ce fichier comme s’il s’agissait de secrets valides.

Variables nécessaires :

- `DJANGO_SECRET_KEY` : secret aléatoire privé d’au moins 50 caractères. Vous pouvez le générer sur votre ordinateur avec `py -c "import secrets; print(secrets.token_urlsafe(64))"`, puis le coller directement dans Render, sans le publier ni l’envoyer dans le chat. Ne pas changer à chaque redéploiement.
- `DJANGO_DEBUG=0`.
- `POSTGRES_HOST`, `POSTGRES_PORT=5432`, `POSTGRES_DB=postgres`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_SSLMODE=require` depuis Supabase Session pooler.
- `MEDIA_STORAGE=s3`, `S3_ENDPOINT_URL`, `S3_REGION_NAME`, `S3_BUCKET_NAME=profile-photos`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` depuis Supabase Storage.
- Les variables Brevo décrites plus haut.

Render fournit automatiquement `RENDER_EXTERNAL_HOSTNAME`. Le code l’ajoute aux hôtes autorisés et aux origines CSRF et l’utilise pour les liens de réinitialisation. Il n’est pas nécessaire d’inventer votre URL Render avant la création du service.

Pour un domaine personnalisé ajouté ensuite, définir explicitement `DJANGO_ALLOWED_HOSTS` avec ses noms d’hôte sans protocole, `DJANGO_CSRF_TRUSTED_ORIGINS=https://votre-domaine` et `FRONTEND_URL=https://votre-domaine`.

### Administrateur initial sans shell Render

Au premier déploiement seulement, ajouter :

- `BOOTSTRAP_ADMIN_PHONE` : téléphone international unique, ex. format `+235` suivi des huit chiffres.
- `BOOTSTRAP_ADMIN_PASSWORD` : nouveau mot de passe fort de 10 caractères minimum.
- `BOOTSTRAP_ADMIN_NAME` et `BOOTSTRAP_ADMIN_EMAIL` : vos informations.

Le script crée un superutilisateur uniquement si ce numéro n’existe pas. Il ne transforme jamais un client existant en administrateur et ne réinitialise pas le mot de passe d’un administrateur existant.

**Après création réussie, retirer `BOOTSTRAP_ADMIN_PASSWORD` et `BOOTSTRAP_ADMIN_PHONE` des variables Render**, puis redéployer. Cette création est facultative : si un administrateur a déjà été transféré dans la base distante, ne pas utiliser ces variables.

## F. Déployer et vérifier

Une fois le code à jour sur GitHub et toutes les valeurs renseignées : **Deploy Web Service**.

Attendre la fin des logs. Vérifier successivement :

1. L’adresse HTTPS du site ouvre React.
2. `/api/health/` retourne `{"status":"ok"}`.
3. `/api/csrf/` retourne un token, sans redirection en boucle.
4. Connexion client et administrateur, puis inscription d’un client de test.
5. Upload d’une photo : le bucket reste privé ; elle persiste après redéploiement.
6. Réinitialisation du mot de passe : vérifier la réception réelle de l’e-mail et l’ouverture du lien HTTPS.
7. Envoi d’un contact de test : message visible dans `/admin/`, même si la notification échoue.

Ne pas publier les logs contenant un lien de réinitialisation ou des secrets. Si le déploiement échoue, partager uniquement le message d’erreur en masquant les valeurs privées.

## Données locales et limites gratuites

La base Supabase commence vide, sauf si vous y restaurez explicitement votre base locale. Les comptes et opérations déjà présents dans Docker ne sont pas envoyés par GitHub. Une migration de données doit conserver les écritures financières et transférer les anciennes photos séparément ; ne pas improviser une copie partielle.

La formule Render gratuite se met en veille et ne garantit pas une disponibilité adaptée à une exploitation financière réelle. Les quotas Supabase et Brevo s’appliquent ; certains comptes peuvent nécessiter une validation. Le stockage privé évite de perdre les photos sur le disque temporaire de Render, mais ne remplace pas les sauvegardes de la base et des objets. Prévoir un service continu et des sauvegardes testées avant une utilisation réelle avec des clients.

Le code est testé localement ; la connexion à vos comptes Supabase/Brevo et le déploiement de votre service Render restent à vérifier avec vos identifiants, qui ne doivent pas être transmis dans le chat.
