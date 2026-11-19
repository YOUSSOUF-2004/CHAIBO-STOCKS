"""Create local development secrets once, without printing them."""
from pathlib import Path
import secrets
root = Path(__file__).resolve().parent
output = root / '.env'
if output.exists():
    print('backend/.env existe déjà : conservé sans modification.')
else:
    content = (root / '.env.example').read_text(encoding='utf-8')
    content = content.replace('DJANGO_SECRET_KEY=\n','DJANGO_SECRET_KEY='+secrets.token_urlsafe(64)+'\n')
    content = content.replace('POSTGRES_PASSWORD=\n','POSTGRES_PASSWORD='+secrets.token_urlsafe(32)+'\n')
    with output.open('x',encoding='utf-8') as handle:
        handle.write(content)
    output.chmod(0o600)
    print('backend/.env créé avec des secrets aléatoires pour le développement local.')
