#!/usr/bin/env bash
# Run on the VPS only. Do not run against a development database.
set -Eeuo pipefail
sha="${1:?Commit SHA obligatoire}"
[[ "$sha" =~ ^[a-f0-9]{40}$ ]] || { echo 'SHA invalide'; exit 1; }
base="${CHAIBO_DEPLOY_ROOT:-/srv/chaibo}"
release="$base/releases/$sha"
export RELEASE_SHA="$sha"
export CHAIBO_ENV_FILE="$base/shared/production.env"
test -f "$CHAIBO_ENV_FILE"
test -f "$release/compose.production.yaml"
exec 9>"$base/shared/deploy.lock"
flock -n 9 || { echo 'Un déploiement est déjà en cours.'; exit 1; }
cd "$release"
compose=(docker compose --env-file "$CHAIBO_ENV_FILE" -f compose.production.yaml)
"${compose[@]}" config --quiet
"${compose[@]}" build backend
"${compose[@]}" up -d --wait db
# Prepare persistent volumes using the same UID as the backend image.
"${compose[@]}" run --rm --no-deps --user root backend sh -c 'chown 10001:10001 /app/uploads /app/staticfiles'
previous="$(readlink -f "$base/current" || true)"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
umask 077
mkdir -p "$base/shared/backups"
# A brief maintenance window prevents application writes during backup/migrations.
"${compose[@]}" stop backend
restart_previous() {
  code=$?
  trap - ERR
  echo 'Déploiement interrompu. Aucune restauration automatique de la base.' >&2
  if [[ -n "$previous" && "$previous" != "$release" ]]; then
    echo "Version précédente : $previous. Vérifier la compatibilité des migrations avant de la relancer." >&2
  fi
  exit "$code"
}
trap restart_previous ERR
backup="$base/shared/backups/$stamp-$sha.sql.gz"
"${compose[@]}" exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --no-acl' | gzip > "$backup.partial"
mv "$backup.partial" "$backup"
"${compose[@]}" run --rm --no-deps backend python manage.py migrate --noinput
"${compose[@]}" run --rm --no-deps backend python manage.py collectstatic --noinput
"${compose[@]}" run --rm --no-deps backend python manage.py check --deploy --fail-level ERROR
"${compose[@]}" up -d --no-deps --wait backend
# Publish frontend only after the backend health check succeeds.
ln -sfn "$release" "$base/current.next"
mv -Tf "$base/current.next" "$base/current"
printf '%s\n' "$sha" > "$base/shared/current-sha"
trap - ERR
echo "Version $sha déployée."
