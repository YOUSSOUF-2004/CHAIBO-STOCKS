import os
from django.core.management.base import BaseCommand,CommandError
from django.core.exceptions import ValidationError
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from core.models import User,normalize_phone

class Command(BaseCommand):
    help = 'Crée un administrateur initial depuis des variables privées, sans modifier de compte existant.'
    def handle(self,*args,**options):
        phone=os.getenv('BOOTSTRAP_ADMIN_PHONE','')
        password=os.getenv('BOOTSTRAP_ADMIN_PASSWORD','')
        if not phone and not password:
            return
        if not phone or not password:
            raise CommandError('Les deux variables BOOTSTRAP_ADMIN_PHONE et BOOTSTRAP_ADMIN_PASSWORD sont nécessaires.')
        try:
            phone=normalize_phone(phone)
            with transaction.atomic():
                # PostgreSQL lock also serializes startup of overlapping deploys.
                from django.db import connection
                with connection.cursor() as cursor:
                    cursor.execute('SELECT pg_advisory_xact_lock(74219831)')
                existing=User.objects.filter(phone=phone).first()
                if existing:
                    if not existing.is_staff or not existing.is_superuser:
                        raise CommandError('Le numéro initial appartient déjà à un compte non superutilisateur. Aucun droit modifié.')
                    self.stdout.write('Administrateur initial déjà présent : aucun mot de passe modifié.')
                    return
                candidate=User(phone=phone,name=os.getenv('BOOTSTRAP_ADMIN_NAME','Administrateur'))
                validate_password(password,candidate)
                User.objects.create_superuser(phone,password,name=candidate.name,email=os.getenv('BOOTSTRAP_ADMIN_EMAIL',''))
        except ValidationError:
            raise CommandError('Téléphone ou mot de passe initial invalide ; aucun secret affiché.')
        self.stdout.write('Administrateur initial créé. Retirez les variables BOOTSTRAP_ADMIN_PASSWORD et BOOTSTRAP_ADMIN_PHONE de Render.')
