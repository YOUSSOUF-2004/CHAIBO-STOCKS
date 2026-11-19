"""Django email backend using Brevo HTTPS API (no SMTP ports required)."""
import json
import os
import urllib.request
from email.utils import parseaddr
from django.core.mail.backends.base import BaseEmailBackend

class BrevoEmailBackend(BaseEmailBackend):
    def send_messages(self,email_messages):
        count=0
        for message in email_messages or []:
            try:
                key=os.environ.get('BREVO_API_KEY','')
                if not key:
                    raise RuntimeError('Configurer BREVO_API_KEY pour envoyer les e-mails.')
                sender_name,sender_email=parseaddr(message.from_email)
                if not sender_email:
                    raise ValueError('Configurer un expéditeur e-mail autorisé.')
                payload={'sender':{'email':sender_email,'name':sender_name or 'CHAIBO STOCK'},'to':[{'email':parseaddr(address)[1]} for address in message.to],'subject':message.subject,'textContent':message.body}
                if message.reply_to:
                    payload['replyTo']={'email':parseaddr(message.reply_to[0])[1]}
                request=urllib.request.Request('https://api.brevo.com/v3/smtp/email',data=json.dumps(payload).encode('utf-8'),headers={'api-key':key,'Content-Type':'application/json','Accept':'application/json'},method='POST')
                with urllib.request.urlopen(request,timeout=10) as response:
                    if response.status not in [200,201,202]:
                        raise RuntimeError('Envoi e-mail refusé.')
                count+=1
            except Exception:
                if not self.fail_silently:
                    # Do not expose provider responses, request contents or API secrets.
                    raise RuntimeError('Impossible de remettre l’e-mail au service d’envoi.') from None
        return count
