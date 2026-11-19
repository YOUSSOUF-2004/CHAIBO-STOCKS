from rest_framework.views import exception_handler

def api_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is not None:
        response.data = {'errors': response.data}
    return response


def csrf_failure(request, reason=''):
    if request.path.startswith('/api/'):
        from django.http import JsonResponse
        return JsonResponse({'errors':{'detail':'Vérification CSRF refusée. Rechargez la page et réessayez.'}},status=403)
    from django.views.csrf import csrf_failure as django_csrf_failure
    return django_csrf_failure(request,reason=reason)
