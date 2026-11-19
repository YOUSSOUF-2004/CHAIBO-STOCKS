# CHAIBO STOCK — React + Django REST Framework + PostgreSQL

Projet complet en français : interface React, backend Django, API REST, PostgreSQL, sessions par cookies, photos de profil et administration. Le domaine fonctionnel correspond aux maquettes initiales : **comptes, soldes FCFA, dépôts, retraits et transferts internes**.

Le mode par défaut se connecte au backend Django. Les soldes commencent à zéro et sont enregistrés dans PostgreSQL. Le mode démonstration précédent reste disponible séparément.

## Installation Windows / PowerShell

Prérequis : **Python 3.12 ou plus récent**, **Node.js 22 LTS ou plus récent**, et **Docker Desktop** démarré pour PostgreSQL. Une installation PostgreSQL locale peut également remplacer Docker (voir plus bas).

Extrayez l’archive dans un nouveau dossier, ouvrez `chaibo-stock` dans VS Code et ouvrez un terminal à la racine du projet.

### 1. Installer Python et générer la configuration locale

```powershell
py -m venv backend\.venv
backend\.venv\Scripts\python.exe -m pip install -r backend\requirements.lock
backend\.venv\Scripts\python.exe backend\setup_env.py
```

`setup_env.py` crée `backend/.env` avec une clé Django et un mot de passe PostgreSQL aléatoires. Il ne les affiche pas et ne remplace jamais un fichier existant. Aucun secret ni compte administrateur prédéfini n’est fourni dans l’archive. Les valeurs de développement dans `.env.example` utilisent HTTP local, pas HTTPS.

Ces commandes utilisent directement l’exécutable Python du projet ; il n’est pas nécessaire d’activer un script PowerShell.

### 2. Démarrer PostgreSQL et créer les tables

```powershell
docker compose --env-file backend/.env up -d --wait db
backend\.venv\Scripts\python.exe backend\manage.py migrate
```

PostgreSQL écoute uniquement sur `127.0.0.1:5432`. Si ce port est déjà occupé, utilisez votre PostgreSQL existant ou changez ensemble le port publié dans `compose.yaml` et `POSTGRES_PORT` dans `backend/.env`.

### 3. Créer votre administrateur

```powershell
backend\.venv\Scripts\python.exe backend\manage.py createsuperuser
```

Saisissez son téléphone (ex. `+23566112233`), son nom et un mot de passe fort. Aucun utilisateur ne peut choisir le rôle administrateur lors de l’inscription publique.

### 4. Lancer Django

```powershell
backend\.venv\Scripts\python.exe backend\manage.py runserver 127.0.0.1:8000
```

Laissez ce terminal ouvert.

### 5. Lancer React dans un deuxième terminal

```powershell
npm.cmd install
npm.cmd run dev
```

Ouvrez **http://localhost:5173**. Vite transmet les requêtes `/api/`, `/admin/` et `/static/` à Django sur le port 8000. Conservez le même nom d’hôte pendant votre session.

- Application : `http://localhost:5173`
- Administration Django : `http://localhost:5173/admin/`
- Administration React : connectez-vous avec le compte administrateur créé à l’étape 3.

Sous Linux/macOS, remplacez `py` par `python3`, l’exécutable du venv par `backend/.venv/bin/python`, et `npm.cmd` par `npm`.

## Utiliser PostgreSQL déjà installé

Créez une base dédiée et un utilisateur propriétaire, puis renseignez `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_HOST` et `POSTGRES_PORT` dans `backend/.env`. Passez la commande Docker et exécutez les migrations. Les tests ont besoin de créer et supprimer une base de test ; utilisez un utilisateur de développement disposant de `CREATEDB`, jamais le compte d’un serveur de production.

Le volume Docker `postgres_data` conserve les données après arrêt. `docker compose --env-file backend/.env down` arrête la base. **N’ajoutez pas `-v` si vous souhaitez conserver vos données.** Modifier le mot de passe dans `.env` ne change pas celui d’un volume PostgreSQL déjà initialisé : il faut alors modifier le mot de passe du rôle PostgreSQL correspondant.

## Parcours fonctionnels

1. **Créer un compte** : téléphone unique normalisé, nom, mot de passe de 10 caractères minimum validé côté serveur et e-mail facultatif. Renseignez un e-mail si vous souhaitez pouvoir réinitialiser le mot de passe.
2. **Connexion** : le serveur attribue le rôle selon le compte, indépendamment de l’affichage client/administrateur du formulaire. La session est portée par un cookie HttpOnly, jamais par un token stocké dans localStorage.
3. **Dépôt** : le client soumet une demande. Le solde reste inchangé jusqu’à la validation d’un administrateur.
4. **Administration → Toutes les opérations** : valider ou refuser un dépôt. Une validation répétée ne crédite jamais deux fois.
5. **Transfert** : renseigner le téléphone d’un autre client actif. Le débit et le crédit sont exécutés ensemble dans une transaction PostgreSQL.
6. **Retrait** : débit interne du compte si le solde est suffisant. Cette opération enregistre le retrait ; elle ne remet pas physiquement des espèces et n’appelle pas de prestataire bancaire.
7. **Historique** : le client voit ses opérations émises et reçues. L’administrateur voit toutes les opérations. Export CSV disponible.
8. **Mon profil / Paramètres** : modifier le nom, l’e-mail et la photo. Le téléphone est l’identifiant de connexion et reste non modifiable dans cette version.
9. **Photos** : JPG, PNG ou WebP, jusqu’à 5 Mo et 20 millions de pixels. Django vérifie et réencode les images en JPEG de 384 × 384 pixels, sans métadonnées originales. Les fichiers sont servis par une route authentifiée, accessible au propriétaire et aux administrateurs.
10. **Gestion des clients** : créer un compte client avec un mot de passe initial, suspendre ou réactiver un client. Un utilisateur suspendu perd l’accès à ses sessions API. Les administrateurs sont créés via `createsuperuser` ou attribués par un administrateur Django autorisé.
11. **Mot de passe oublié** : lien signé à usage unique, valable une heure. En développement, le message est écrit dans le terminal Django ; en production, configurez SMTP. Changer le mot de passe invalide les anciennes sessions.

Les opérations ne déclenchent aucun mouvement sur un réseau bancaire ou mobile money externe. Un dépôt doit être validé après vérification réelle des fonds par l’agent.

## Organisation du code

```text
backend/
  manage.py
  setup_env.py              # Génération unique des secrets locaux
  requirements.txt          # Plages de versions compatibles
  requirements.lock         # Versions Python utilisées pour les vérifications
  .env.example
  config/
    settings.py             # PostgreSQL, cookies, CSRF, SMTP, sécurité
    urls.py
    wsgi.py
  core/
    models.py               # Utilisateurs, comptes, opérations, écritures et limites de connexion
    serializers.py          # Validation des entrées, images et réponses
    services.py             # Transactions, verrous, idempotence et comptabilisation
    views.py                # API authentifiée et permissions
    urls.py                 # Routes API
    admin.py                # Administration Django ; soldes/historique non modifiables directement
    security.py             # Adresse IP et configuration du proxy de confiance
    middleware.py           # Réponses API privées sans cache
    migrations/             # Tables, contraintes et cache partagé en base
    tests.py                # Tests API, CSRF, permissions, images et concurrence réelle
src/
  App.jsx                   # État partagé et sélection API / démonstration
  routes.jsx                # Pages React reliées par HashRouter
  hooks/useBackendApi.js    # Sessions et actions connectées au backend
  services/api.js           # fetch, cookies, token CSRF et conversion des réponses
  pages/                    # Accueil, connexion, inscription, récupération d’accès
    client/                 # Tableau de bord, transfert, dépôt, retrait, historique, profil
    admin/                  # Tableau de bord, clients, opérations, paramètres
  components/               # Avatar, photos, logo et historique réutilisable
  layouts/                  # Navigation publique et espaces connectés
  style.css
scripts/
  test-routes.mjs            # Tests de navigation en mode démonstration
  test-photo.mjs             # Tests photo locaux
  test-api.mjs               # Parcours React relié à un vrai serveur Django/PostgreSQL
compose.yaml                # PostgreSQL local
vite.config.js              # Proxy même origine vers Django
backend/Dockerfile          # Image backend Linux/Gunicorn
 deploy/nginx.example.conf  # Exemple de domaine HTTPS unique
```

## Endpoints principaux

Toutes les routes API commencent par `/api/` et se terminent par `/`. Les réponses d’erreur utilisent `{"errors": ...}`. Les listes sont paginées avec `limit` (maximum 200) et `offset`. React charge les pages nécessaires.

| Méthode | Route | Accès / fonction |
| --- | --- | --- |
| GET | `csrf/` | Token CSRF et cookie ; accessible sans connexion |
| GET | `session/` | État de connexion actuel |
| POST | `auth/register/` | Créer un compte client |
| POST | `auth/login/` | Connexion par téléphone et mot de passe |
| POST | `auth/logout/` | Déconnexion |
| POST | `auth/password-reset/` | Envoyer un lien, réponse générique |
| POST | `auth/password-reset/confirm/` | Choisir le nouveau mot de passe |
| GET / PATCH | `me/` | Lire/modifier son profil ; multipart pour la photo |
| GET | `users/<id>/photo/` | Photo privée, propriétaire ou administrateur |
| GET / POST | `operations/` | Historique autorisé / créer une opération client |
| POST | `admin/deposits/<uuid>/decision/` | Administrateur : approuver/refuser un dépôt |
| GET / POST | `admin/clients/` | Administrateur : liste/création des clients |
| PATCH | `admin/clients/<id>/` | Administrateur : activer/suspendre |
| GET | `admin/stats/` | Statistiques globales |

Exemple de création d’opération (après connexion et avec l’en-tête CSRF) :

```json
{
  "kind": "transfer",
  "amount": "5000",
  "recipient_phone": "+23566112233",
  "reference": "Remboursement",
  "idempotency_key": "11c0eac9-9092-49d8-bb51-c437ff2b7555"
}
```

Types : `deposit`, `withdrawal`, `transfer`. Montants : entiers strictement positifs en FCFA. Un UUID différent identifie chaque nouvelle opération. Réutilisez le même UUID et les mêmes données en cas de nouvelle tentative réseau ; le serveur retourne alors l’opération existante. Réutiliser un UUID avec des données différentes est refusé.

Pour un client HTTP externe : appelez `GET /api/csrf/`, conservez ses cookies et transmettez le `csrfToken` retourné dans `X-CSRFToken` pour les écritures, y compris connexion et inscription. Après connexion, récupérez un nouveau token CSRF, car Django le renouvelle. L’application React le fait automatiquement.

## Vérifications

Avec PostgreSQL local démarré :

```powershell
backend\.venv\Scripts\python.exe backend\manage.py test core --noinput
npm.cmd test
npm.cmd run build
```

Les tests backend vérifient notamment les permissions, la protection CSRF, les photos privées, les montants invalides, les dépôts répétés et **deux retraits simultanés**, **deux transferts identiques simultanés** et **deux validations simultanées** sur PostgreSQL. Ils utilisent une base `test_<nom>` distincte, créée puis supprimée par Django. Ne les exécutez jamais contre une configuration de production.

Le test d’intégration facultatif utilise le serveur Django en cours et crée deux clients et des opérations de test. Utilisez une base de développement isolée :

```powershell
$env:CHAIBO_TEST_API="http://127.0.0.1:8000"
$env:CHAIBO_TEST_ADMIN_PHONE="VOTRE_TELEPHONE_ADMIN_TEST"
$env:CHAIBO_TEST_ADMIN_PASSWORD="VOTRE_MOT_DE_PASSE_ADMIN_TEST"
npm.cmd run test:api
```

## Démonstration statique séparée

Le site de présentation hébergé reste une démonstration autonome. Il n’héberge pas Python ni PostgreSQL. Le backend fourni dans l’archive s’exécute sur votre ordinateur ou un hébergeur compatible Django.

Pour utiliser uniquement la démonstration précédente, créez `.env` à la racine avec `VITE_API_MODE=demo`, puis redémarrez Vite. Pour le backend, supprimez cette valeur ou utilisez `VITE_API_MODE=api`. Les profils de démonstration sont locaux et ne sont pas transférés automatiquement dans PostgreSQL.

## Déploiement de production

Cette archive constitue une base applicative testée ; le serveur de développement Django et les réglages HTTP locaux ne doivent pas être exposés tels quels sur Internet.

1. Héberger Django sur un serveur Python/Gunicorn et PostgreSQL sur une base privée. L’image `backend/Dockerfile` est fournie ; exécuter séparément les migrations et `collectstatic` avant le démarrage de Gunicorn.
2. Configurer une clé Django aléatoire privée, `DJANGO_DEBUG=0`, le domaine dans `DJANGO_ALLOWED_HOSTS`, et `DJANGO_CSRF_TRUSTED_ORIGINS=https://votre-domaine`. Les cookies Secure, la redirection HTTPS et HSTS sont activés automatiquement hors mode debug.
3. Configurer `FRONTEND_URL=https://votre-domaine`, SMTP et l’expéditeur des e-mails. Aucune vérification de propriété d’e-mail ni MFA n’est activée dans cette version.
4. Compiler React avec `VITE_API_MODE=api`, puis servir `dist/` et `/api/` sur **le même domaine HTTPS**. Utiliser `deploy/nginx.example.conf` comme exemple à adapter.
5. Si le backend se trouve exclusivement derrière un proxy de confiance, configurer `DJANGO_TRUST_PROXY=1`. Le proxy doit remplacer `X-Real-IP` et `X-Forwarded-Proto` et le backend doit être inaccessible directement depuis Internet. Sans cette configuration, les compteurs de connexion utilisent l’adresse réseau vue directement par Django.
6. Conserver les fichiers `backend/uploads/` dans un stockage persistant privé et sauvegardé. Ne jamais les servir comme un dossier public. Les fichiers statiques Django se trouvent dans `backend/staticfiles/` après `collectstatic`.
7. Configurer les sauvegardes PostgreSQL, la rotation des journaux, la surveillance et une limitation de débit au proxy. Le backend possède des limites de connexion partagées en base et des limites API ; une défense de périmètre reste nécessaire pour l’exploitation publique.
8. Vérifier la configuration avec `python manage.py check --deploy` depuis `backend/`. Ajouter, selon le contexte d’exploitation financière, MFA administrateur, vérification des identités, procédures de rapprochement des fonds et intégration du prestataire de paiement avant usage réel.

Les écritures financières sont produites par les services métier uniquement, avec contraintes de base, verrous PostgreSQL et journal d’écritures. Les soldes, opérations et écritures sont consultables mais non éditables directement dans Django Admin.

Note sur `check --deploy` : l’avertissement `security.W021` concernant la liste HSTS preload est volontaire. Le préchargement HSTS nécessite une décision liée au domaine et à ses sous-domaines ; il n’est pas activé automatiquement par ce projet. HTTPS, HSTS et les cookies Secure restent activés avec `DJANGO_DEBUG=0`.

## Workflow GitHub Actions de production

Le workflow est fourni dans `.github/workflows/deploy.yml`, avec `compose.production.yaml` et le script `deploy/release.sh`. Le guide complet des secrets GitHub, du VPS, de Nginx et du premier déploiement se trouve dans **`deploy/README.md`**. Aucun déploiement vers un VPS n’a été exécuté depuis cette conversation : il faut d’abord configurer votre dépôt et votre serveur.

## Formulaire de contact et WhatsApp

La page `/#/contact` enregistre les demandes dans PostgreSQL et peut notifier le support par e-mail. Les demandes sont consultables dans **Django Admin → Messages de contact**. Le bouton WhatsApp utilise le numéro de support configuré. Les instructions de mise à jour, la configuration SMTP et les fichiers concernés sont détaillés dans **MISE_A_JOUR_CONTACT.md**.

## Hébergement Render + Supabase

Voir **DEPLOIEMENT_RENDER.md** pour le déploiement gratuit de test. Utiliser `Dockerfile.render` à la racine, qui compile React et exécute Django sur une même origine HTTPS. La configuration VPS précédente reste séparée.
