import ipaddress
from django.conf import settings

def client_ip(request):
    value = request.META.get('REMOTE_ADDR','unknown')
    if getattr(settings,'TRUST_PROXY',False):
        value = request.META.get('HTTP_X_REAL_IP',value)
    try:
        return str(ipaddress.ip_address(value))
    except ValueError:
        return 'unknown'
