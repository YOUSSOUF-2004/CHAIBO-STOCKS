from django.conf import settings
from django.http import FileResponse,Http404
from django.views.decorators.cache import never_cache

@never_cache
def index(request):
    path=settings.FRONTEND_DIST/'index.html'
    if not path.is_file():
        raise Http404('Interface non compilée. En local, utilisez Vite sur le port 5173.')
    return FileResponse(path.open('rb'),content_type='text/html; charset=utf-8')
