import logging
from django.conf import settings
from django.core.mail import EmailMessage
from .models import ContactMessage
logger = logging.getLogger('core')

def notify_support(pk):
    # Called after commit: SMTP failure never loses the customer's saved message.
    message = ContactMessage.objects.filter(pk=pk).first()
    if message is None or message.notification_sent or not settings.SUPPORT_EMAIL:
        return
    try:
        sent = EmailMessage(
            subject=f'CHAIBO STOCK — Contact {message.pk}',
            body=f'Nom : {message.name}\nE-mail : {message.email}\nSujet : {message.subject}\n\n{message.message}\n\nRéférence : {message.pk}',
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[settings.SUPPORT_EMAIL],
            reply_to=[message.email],
        ).send(fail_silently=False)
        if sent:
            ContactMessage.objects.filter(pk=pk).update(notification_sent=True)
    except Exception:
        logger.warning('Notification support non envoyée ; le message reste disponible dans Django Admin.')
