#!/bin/sh
set -eu
python manage.py check --deploy --fail-level ERROR
python manage.py prepare_render_db
python manage.py migrate --noinput
python manage.py collectstatic --noinput
python manage.py bootstrap_admin
exec gunicorn config.wsgi:application --bind "0.0.0.0:${PORT:-10000}" --workers 1 --threads 4 --timeout 120 --access-logfile -
