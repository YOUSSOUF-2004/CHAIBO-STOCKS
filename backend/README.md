# Backend CHAIBO STOCK

Django 5.2 LTS, Django REST Framework, PostgreSQL et Pillow.

Le guide complet est dans le fichier `README.md` à la racine de l’archive. Exécutez les commandes depuis cette racine : génération de `backend/.env`, démarrage PostgreSQL, `migrate`, `createsuperuser` et lancement du serveur.

Les photos sont des fichiers privés sous `uploads/`. Elles sont accessibles uniquement par une route API authentifiée. Les soldes et les écritures financières sont gérés par `core/services.py` à l’intérieur de transactions PostgreSQL.

Tests : `python backend/manage.py test core --noinput` avec l’interpréteur de votre environnement virtuel et PostgreSQL de développement démarré. Aucune base de production ne doit être utilisée pour les tests.
