from django.conf import settings
from django.db.backends.signals import connection_created
from django.dispatch import receiver
from psycopg import sql

@receiver(connection_created)
def set_private_schema(sender,connection,**kwargs):
    schema=getattr(settings,'CHAIBO_DB_SCHEMA','')
    if schema and connection.vendor=='postgresql':
        # SET works with Supabase session pooling without special startup options.
        with connection.cursor() as cursor:
            cursor.execute(sql.SQL('SET search_path TO {}').format(sql.Identifier(schema)))
