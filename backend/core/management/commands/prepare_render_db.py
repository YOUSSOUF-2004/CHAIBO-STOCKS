from django.core.management.base import BaseCommand
from django.conf import settings
from django.db import connection
from psycopg import sql

class Command(BaseCommand):
    help = 'Prépare le schéma privé des tables Django, hors API publique Supabase.'
    def handle(self,*args,**options):
        schema=getattr(settings,'CHAIBO_DB_SCHEMA','')
        if not schema:
            return
        with connection.cursor() as cursor:
            cursor.execute(sql.SQL('CREATE SCHEMA IF NOT EXISTS {}').format(sql.Identifier(schema)))
            cursor.execute(sql.SQL('REVOKE ALL ON SCHEMA {} FROM PUBLIC').format(sql.Identifier(schema)))
            cursor.execute("SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated')")
            roles=[row[0] for row in cursor.fetchall()]
            for role in roles:
                cursor.execute(sql.SQL('REVOKE ALL ON SCHEMA {} FROM {}').format(sql.Identifier(schema),sql.Identifier(role)))
        self.stdout.write('Schéma privé Django prêt.')
