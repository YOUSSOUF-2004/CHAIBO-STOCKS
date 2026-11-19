# Déploiement GitHub Actions → VPS Ubuntu

Le fichier `.github/workflows/deploy.yml` lance les tests sur les pull requests et déploie les commits de `main` après réussite. Un lancement manuel est aussi disponible dans Actions. Aucun serveur n’est créé automatiquement : préparez le VPS une fois avant le premier déploiement.

## 1. Préparer le VPS

Prévoir Ubuntu LTS, un domaine pointant vers le VPS, Docker Engine avec Compose v2 récent (`up --wait`), Nginx, SSH, `flock`, `gzip` et un certificat HTTPS Let’s Encrypt valide. N’exposer que SSH, HTTP et HTTPS. PostgreSQL n’a aucun port public ; Gunicorn écoute sur le loopback du VPS.

Créer un utilisateur dédié `deploy` avec accès SSH par clé, puis, depuis un compte administrateur du VPS :

```sh
sudo usermod -aG docker deploy
sudo mkdir -p /srv/chaibo/{incoming,releases,shared/uploads,shared/static,shared/backups}
sudo chown -R deploy:deploy /srv/chaibo
```

Reconnecter la session SSH de `deploy` après ajout au groupe Docker. Ce groupe donne des droits élevés sur la machine : réserver ce compte au déploiement.

## 2. Configurer les secrets sur le serveur

Copier `deploy/production.env.example` vers **`/srv/chaibo/shared/production.env`**, puis éditer ce fichier sur le VPS. Générer deux valeurs différentes pour la clé Django et le mot de passe PostgreSQL, par exemple avec `openssl rand -hex 48`. Ne pas utiliser les valeurs de remplacement de l’exemple.

Configurer le vrai domaine, les origines HTTPS et SMTP. Garder `DJANGO_DEBUG=0` et `DJANGO_TRUST_PROXY=1`. Le proxy fourni remplace les en-têtes d’adresse et de protocole ; le backend doit rester inaccessible directement depuis Internet.

```sh
chmod 600 /srv/chaibo/shared/production.env
```

Ce fichier reste hors du dépôt et n’est jamais envoyé par GitHub Actions. Changer son mot de passe PostgreSQL ne modifie pas le mot de passe d’une base déjà initialisée : effectuer alors le changement du rôle dans PostgreSQL également.

## 3. Configurer GitHub

Créer un dépôt privé et y pousser le projet, y compris le dossier `.github` et les fichiers de déploiement. Ne pas pousser `.env`, `node_modules`, les photos ni les données PostgreSQL.

Dans **Settings → Environments**, créer l’environnement **`production`**. Limiter ses déploiements à la branche `main`. Une validation humaine peut être activée dans cet environnement si souhaité.

Dans cet environnement, ajouter les **Secrets** :

| Secret | Valeur |
| --- | --- |
| `DEPLOY_HOST` | IP ou nom DNS du VPS, sans `https://` |
| `DEPLOY_USER` | `deploy` |
| `DEPLOY_SSH_KEY` | Clé privée SSH dédiée, complète, permettant l’accès au VPS |
| `DEPLOY_KNOWN_HOSTS` | Ligne de clé publique hôte SSH du VPS, vérifiée via sa console ou votre hébergeur |

Ajouter la clé **publique** correspondant à `DEPLOY_SSH_KEY` dans `/home/deploy/.ssh/authorized_keys`. La clé privée de déploiement doit fonctionner sans interaction ; ne pas réutiliser une clé personnelle.

Pour un port SSH différent de 22, créer la **variable** d’environnement GitHub `DEPLOY_PORT`. Pour un port personnalisé, l’entrée `known_hosts` doit utiliser le format `[hote]:port`. Vérifier son empreinte par un canal de confiance ; le workflow refuse les clés hôte inconnues ou différentes.

Le workflow utilise uniquement un token GitHub en lecture pour récupérer le code. Il n’a pas besoin d’un token personnel GitHub sur le VPS : il transfère l’archive déjà testée par SSH.

## 4. Premier lancement

Pousser sur `main` ou lancer **Actions → Tests et déploiement CHAIBO STOCK → Run workflow** sur `main`.

Le workflow :

1. Démarre PostgreSQL isolé dans GitHub Actions.
2. Installe Python/Node et les dépendances verrouillées.
3. Vérifie les migrations et exécute les tests backend et frontend.
4. Teste le parcours réel React → Django → PostgreSQL, puis compile React en mode API.
5. Transfère l’archive sur le VPS dans une version identifiée par le SHA du commit.
6. Construit l’image backend, démarre PostgreSQL, arrête brièvement le backend existant et sauvegarde la base.
7. Applique les migrations, collecte les fichiers statiques et vérifie Django.
8. Démarre Gunicorn, attend le contrôle `/api/health/`, puis change le lien `/srv/chaibo/current` vers le nouveau frontend.

**Une courte interruption du service est prévue pendant la sauvegarde et les migrations.** Il ne s’agit pas d’un déploiement sans interruption.

Une fois le premier workflow réussi, adapter `deploy/nginx.example.conf` au domaine et aux certificats réels, l’installer dans Nginx puis exécuter :

```sh
sudo nginx -t
sudo systemctl reload nginx
```

Ce fichier sert React depuis `/srv/chaibo/current/dist`, les fichiers statiques Django depuis `/srv/chaibo/shared/static` et transmet les API à `127.0.0.1:8000`. Les photos restent privées.

Créer ensuite l’administrateur, dans une session SSH sur le VPS :

```sh
cd /srv/chaibo/current
export RELEASE_SHA="$(cat /srv/chaibo/shared/current-sha)"
export CHAIBO_ENV_FILE=/srv/chaibo/shared/production.env
docker compose --env-file "$CHAIBO_ENV_FILE" -f compose.production.yaml exec backend python manage.py createsuperuser
```

Le serveur continuera à fonctionner après fermeture de SSH. Les services Docker redémarrent automatiquement avec le moteur Docker.

## 5. Mises à jour

Modifier le code localement, créer une branche et une pull request. Après validation des tests, fusionner dans `main`. Le déploiement reprend le même processus. Les photos et PostgreSQL sont conservés indépendamment des versions du code.

Les fichiers statiques partagés sont accessibles à Nginx en lecture ; les dossiers uploads/static sont possédés par l’UID 10001 de l’image backend. Ne pas lancer le backend avec un autre UID sans ajuster ces permissions.

## 6. Échec et retour à une version précédente

Si un test échoue, le serveur n’est pas modifié. Si le contrôle de santé échoue après les migrations, le frontend ne bascule pas et l’Action échoue. **La base n’est jamais restaurée automatiquement** : une migration peut être incompatible avec le code précédent.

Les sauvegardes se trouvent dans `/srv/chaibo/shared/backups/` et les versions dans `/srv/chaibo/releases/<sha>`. Examiner les logs avec la commande Compose du paragraphe précédent suivie de `logs --tail=100 backend`.

Après vérification de la compatibilité du schéma, un opérateur peut redéployer une version conservée :

```sh
bash /srv/chaibo/releases/SHA_PRECEDENT/deploy/release.sh SHA_PRECEDENT
```

Utiliser le SHA complet de 40 caractères. Cette commande crée aussi une sauvegarde et n’annule pas automatiquement les migrations. Une restauration PostgreSQL doit être préparée explicitement avec arrêt des écritures ; ne pas utiliser `down -v`.

Prévoir des sauvegardes chiffrées **hors du VPS** pour la base et les photos, tester leur restauration et gérer leur rétention. Le script crée une sauvegarde locale de base avant déploiement ; il ne remplace pas cette stratégie. Conserver assez d’espace disque pour les images Docker, versions et sauvegardes ; aucun nettoyage destructif n’est automatique.

## Activation du job VPS

Le job de déploiement SSH est désactivé tant que la variable de dépôt GitHub `ENABLE_VPS_DEPLOY` ne vaut pas `true`. L’activer uniquement après la configuration du VPS et de ses secrets. Pour Render, laisser cette variable absente ou à `false` : les tests continuent et aucun accès SSH VPS n’est tenté.
