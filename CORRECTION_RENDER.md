# Correction Render : démarrage sans photos ni messagerie

1. Copier le contenu de cette archive dans `C:\Users\youss\chaibo-stock-github`, en remplaçant les fichiers existants. Ne pas supprimer le dossier `.git` ni les fichiers `.env` locaux.
2. Dans ce dossier, exécuter `git add .`, puis `git commit -m "Desactiver temporairement photos et messagerie"`, puis `git push origin main`.
3. Conserver le service Render existant. Dockerfile Path : `./Dockerfile.render`, Root Directory vide, Docker Build Context Directory : `.`.
4. Conserver DJANGO_SECRET_KEY, DJANGO_DEBUG=0 et les variables POSTGRES déjà renseignées.
5. Ajouter CHAIBO_PHOTOS_ENABLED=0 et CHAIBO_MESSAGING_ENABLED=0. Les anciennes variables MEDIA_STORAGE=s3 et S3_* peuvent être supprimées ; elles sont ignorées tant que les photos sont désactivées.
6. Révoquer dans Supabase toute clé S3 dont le secret a été partagé en capture. Aucune nouvelle clé S3 n’est requise.
7. Pour le premier administrateur, ajouter BOOTSTRAP_ADMIN_PHONE et BOOTSTRAP_ADMIN_PASSWORD (fort et privé), facultativement BOOTSTRAP_ADMIN_NAME et BOOTSTRAP_ADMIN_EMAIL. Retirer les deux premières variables après la création réussie.
8. Suivre le déploiement automatique de Render après le push. Si nécessaire, Manual Deploy > Deploy latest commit. Vérifier `/api/health/`, puis l’inscription et la connexion.

Les photos sont remplacées par les initiales. Les e-mails, les liens WhatsApp et les formulaires de contact/réinitialisation sont temporairement désactivés. Les comptes et opérations restent dans Supabase ; aucune donnée locale n’est transférée automatiquement.

Pour une réinitialisation exceptionnelle sans e-mail, l’administrateur peut changer le mot de passe d’un utilisateur dans Django Admin après vérification de son identité. Ce n’est pas un accès public ni un contournement de connexion.
