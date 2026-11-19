import os
from pathlib import Path
from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / '.env')
DEBUG = os.getenv('DJANGO_DEBUG', '0') == '1'
SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', '')
if len(SECRET_KEY) < 50:
    raise ImproperlyConfigured('Définir DJANGO_SECRET_KEY avec au moins 50 caractères aléatoires.')
ALLOWED_HOSTS = [h.strip() for h in os.getenv('DJANGO_ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',') if h.strip()]
CSRF_TRUSTED_ORIGINS = [h.strip() for h in os.getenv('DJANGO_CSRF_TRUSTED_ORIGINS', '').split(',') if h.strip()]
INSTALLED_APPS = ['django.contrib.admin','django.contrib.auth','django.contrib.contenttypes','django.contrib.sessions','django.contrib.messages','django.contrib.staticfiles','rest_framework','core']
MIDDLEWARE = ['core.middleware.PrivateApiMiddleware','django.middleware.security.SecurityMiddleware','whitenoise.middleware.WhiteNoiseMiddleware','django.contrib.sessions.middleware.SessionMiddleware','django.middleware.common.CommonMiddleware','django.middleware.csrf.CsrfViewMiddleware','django.contrib.auth.middleware.AuthenticationMiddleware','django.contrib.messages.middleware.MessageMiddleware','django.middleware.clickjacking.XFrameOptionsMiddleware']
ROOT_URLCONF = 'config.urls'
WSGI_APPLICATION = 'config.wsgi.application'
TEMPLATES = [{'BACKEND':'django.template.backends.django.DjangoTemplates','DIRS':[],'APP_DIRS':True,'OPTIONS':{'context_processors':['django.template.context_processors.request','django.contrib.auth.context_processors.auth','django.contrib.messages.context_processors.messages']}}]
DATABASES = {'default': {'ENGINE':'django.db.backends.postgresql','NAME':os.getenv('POSTGRES_DB','chaibo'),'USER':os.getenv('POSTGRES_USER','chaibo'),'PASSWORD':os.getenv('POSTGRES_PASSWORD',''),'HOST':os.getenv('POSTGRES_HOST','127.0.0.1'),'PORT':os.getenv('POSTGRES_PORT','5432'),'CONN_MAX_AGE':60}}
AUTH_USER_MODEL = 'core.User'
AUTH_PASSWORD_VALIDATORS = [ {'NAME':'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'}, {'NAME':'django.contrib.auth.password_validation.MinimumLengthValidator','OPTIONS':{'min_length':10}}, {'NAME':'django.contrib.auth.password_validation.CommonPasswordValidator'}, {'NAME':'django.contrib.auth.password_validation.NumericPasswordValidator'} ]
LANGUAGE_CODE = 'fr-fr'
TIME_ZONE = 'Africa/Ndjamena'
USE_I18N = True
USE_TZ = True
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
MEDIA_ROOT = BASE_DIR / 'uploads'
# Uploaded photos are served through authenticated API views, never as public media.
MEDIA_URL = '/private-media/'
STORAGES = {'default':{'BACKEND':'django.core.files.storage.FileSystemStorage'},'staticfiles':{'BACKEND':'whitenoise.storage.CompressedManifestStaticFilesStorage'}}
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
REST_FRAMEWORK = {'DEFAULT_AUTHENTICATION_CLASSES':['rest_framework.authentication.SessionAuthentication'],'DEFAULT_PERMISSION_CLASSES':['rest_framework.permissions.IsAuthenticated'],'DEFAULT_RENDERER_CLASSES':['rest_framework.renderers.JSONRenderer'],'DEFAULT_THROTTLE_CLASSES':['rest_framework.throttling.ScopedRateThrottle'],'DEFAULT_THROTTLE_RATES':{'auth':'20/min','write':'60/min'},'DEFAULT_PAGINATION_CLASS':'rest_framework.pagination.LimitOffsetPagination','PAGE_SIZE':100,'EXCEPTION_HANDLER':'core.errors.api_exception_handler'}
# Database-backed cache shares auth endpoint throttling across workers.
CACHES = {'default':{'BACKEND':'django.core.cache.backends.db.DatabaseCache','LOCATION':'chaibo_cache'}}
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SECURE = not DEBUG
SESSION_COOKIE_SAMESITE = 'Lax'
SESSION_COOKIE_AGE = 8 * 60 * 60
SESSION_EXPIRE_AT_BROWSER_CLOSE = True
CSRF_COOKIE_HTTPONLY = True
CSRF_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SAMESITE = 'Lax'
SECURE_SSL_REDIRECT = not DEBUG
SECURE_HSTS_SECONDS = 31536000 if not DEBUG else 0
SECURE_HSTS_INCLUDE_SUBDOMAINS = not DEBUG
SECURE_HSTS_PRELOAD = False
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
# Enable only behind a trusted proxy that strips client-supplied forwarded headers.
TRUST_PROXY = os.getenv('DJANGO_TRUST_PROXY','0') == '1'
if TRUST_PROXY:
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
DATA_UPLOAD_MAX_MEMORY_SIZE = 7 * 1024 * 1024
FILE_UPLOAD_MAX_MEMORY_SIZE = 5 * 1024 * 1024
EMAIL_BACKEND = os.getenv('EMAIL_BACKEND','django.core.mail.backends.smtp.EmailBackend')
EMAIL_HOST = os.getenv('EMAIL_HOST','localhost')
EMAIL_PORT = int(os.getenv('EMAIL_PORT','587'))
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER','')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD','')
EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS','1') == '1'
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL','noreply@localhost')
FRONTEND_URL = os.getenv('FRONTEND_URL','http://localhost:5173').rstrip('/')
PASSWORD_RESET_TIMEOUT = 3600
LOGGING = {'version':1,'disable_existing_loggers':False,'handlers':{'console':{'class':'logging.StreamHandler'}},'loggers':{'django.security':{'handlers':['console'],'level':'WARNING','propagate':False},'core':{'handlers':['console'],'level':'INFO','propagate':False}}}

# Ignore spoofed forwarded addresses unless the deployment explicitly trusts its proxy.
REST_FRAMEWORK["NUM_PROXIES"] = 1 if TRUST_PROXY else 0
CSRF_FAILURE_VIEW = "core.errors.csrf_failure"

SUPPORT_EMAIL = os.getenv("SUPPORT_EMAIL","youssoufchaiboabakaradam@gmail.com")
EMAIL_TIMEOUT = 10
REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]["contact"] = "5/hour"

# Render: one HTTPS origin for React, Django and authenticated API requests.
IS_RENDER = os.getenv('CHAIBO_RENDER','0') == '1'
FRONTEND_DIST = Path(os.getenv('FRONTEND_DIST', str(BASE_DIR / 'frontend_dist')))
if FRONTEND_DIST.is_dir():
    WHITENOISE_ROOT = str(FRONTEND_DIST)
if IS_RENDER:
    if DEBUG:
        raise ImproperlyConfigured('DJANGO_DEBUG doit être 0 sur Render.')
    render_hostname = os.getenv('RENDER_EXTERNAL_HOSTNAME','').strip()
    if render_hostname:
        if render_hostname not in ALLOWED_HOSTS:
            ALLOWED_HOSTS.append(render_hostname)
        if 'https://'+render_hostname not in CSRF_TRUSTED_ORIGINS:
            CSRF_TRUSTED_ORIGINS.append('https://'+render_hostname)
        if not os.getenv('FRONTEND_URL'):
            FRONTEND_URL = 'https://'+render_hostname
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO','https')
    TRUST_PROXY = True
    REST_FRAMEWORK['NUM_PROXIES'] = 1
    EMAIL_BACKEND = os.getenv('EMAIL_BACKEND','core.email_backends.BrevoEmailBackend')

# Optional hosted PostgreSQL connection string. Never commit its real value.
if os.getenv('DATABASE_URL'):
    from urllib.parse import urlsplit,unquote,parse_qs
    parsed = urlsplit(os.environ['DATABASE_URL'])
    if parsed.scheme not in ['postgres','postgresql'] or not parsed.hostname or not parsed.path.strip('/'):
        raise ImproperlyConfigured('DATABASE_URL doit désigner une base PostgreSQL valide.')
    DATABASES['default'].update({'NAME':unquote(parsed.path.lstrip('/')),'USER':unquote(parsed.username or ''),'PASSWORD':unquote(parsed.password or ''),'HOST':parsed.hostname,'PORT':str(parsed.port or 5432)})
ssl_mode = os.getenv('POSTGRES_SSLMODE','require' if IS_RENDER else 'prefer')
if IS_RENDER and ssl_mode not in ['require','verify-ca','verify-full']:
    raise ImproperlyConfigured('Une connexion PostgreSQL TLS est obligatoire sur Render.')
DATABASES['default']['OPTIONS'] = {'sslmode':ssl_mode}
# Keep Django's financial tables outside Supabase's exposed public schema.
CHAIBO_DB_SCHEMA = 'chaibo_private' if IS_RENDER else ''

# Photos and outbound messaging are optional; Render starts without provider keys.
PHOTOS_ENABLED = os.getenv('CHAIBO_PHOTOS_ENABLED', '0' if IS_RENDER else '1') == '1'
MESSAGING_ENABLED = os.getenv('CHAIBO_MESSAGING_ENABLED', '0' if IS_RENDER else '1') == '1'
if not MESSAGING_ENABLED:
    EMAIL_BACKEND = 'django.core.mail.backends.dummy.EmailBackend'

if PHOTOS_ENABLED and os.getenv('MEDIA_STORAGE','local') == 's3':
    needed = ['S3_ENDPOINT_URL','S3_ACCESS_KEY_ID','S3_SECRET_ACCESS_KEY','S3_BUCKET_NAME','S3_REGION_NAME']
    if any(not os.getenv(name) for name in needed):
        raise ImproperlyConfigured('Configurer les cinq variables S3 du stockage privé.')
    if not os.environ['S3_ENDPOINT_URL'].startswith('https://'):
        raise ImproperlyConfigured('Le stockage privé doit utiliser HTTPS.')
    STORAGES['default'] = {'BACKEND':'storages.backends.s3.S3Storage','OPTIONS':{'endpoint_url':os.environ['S3_ENDPOINT_URL'],'access_key':os.environ['S3_ACCESS_KEY_ID'],'secret_key':os.environ['S3_SECRET_ACCESS_KEY'],'bucket_name':os.environ['S3_BUCKET_NAME'],'region_name':os.environ['S3_REGION_NAME'],'addressing_style':'path','signature_version':'s3v4','default_acl':None,'file_overwrite':False,'querystring_auth':True}}
elif PHOTOS_ENABLED and IS_RENDER:
    raise ImproperlyConfigured('Render utilise un disque temporaire : configurer MEDIA_STORAGE=s3 pour conserver les photos.')
