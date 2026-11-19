import uuid
from unittest.mock import patch
from django.test import TestCase,override_settings
from django.core import mail
from django.core.cache import cache
from rest_framework.test import APIClient
from .models import ContactMessage,User

@override_settings(SECURE_SSL_REDIRECT=False,EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',SUPPORT_EMAIL='support@example.test')
class ContactTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client=APIClient()
        self.body={'request_id':str(uuid.uuid4()),'name':'Client Test','email':'client@example.test','subject':'Question sur mon dépôt','message':'Bonjour, je souhaite savoir comment valider mon dépôt.','website':''}
    def test_public_message_is_saved_and_notification_has_reply_to(self):
        with self.captureOnCommitCallbacks(execute=True):
            response=self.client.post('/api/contact/',self.body,format='json')
        self.assertEqual(response.status_code,201)
        message=ContactMessage.objects.get()
        self.assertEqual(str(message.pk),response.data['id'])
        self.assertTrue(message.notification_sent)
        self.assertEqual(mail.outbox[0].to,['support@example.test'])
        self.assertEqual(mail.outbox[0].reply_to,['client@example.test'])
        self.assertNotIn('internal_notes',response.data)
    def test_retry_does_not_duplicate_message_or_notification(self):
        with self.captureOnCommitCallbacks(execute=True):self.client.post('/api/contact/',self.body,format='json')
        with self.captureOnCommitCallbacks(execute=True):response=self.client.post('/api/contact/',self.body,format='json')
        self.assertEqual(response.status_code,200)
        self.assertEqual(ContactMessage.objects.count(),1)
        self.assertEqual(len(mail.outbox),1)
        response=self.client.post('/api/contact/',{**self.body,'message':'Un autre contenu avec le même identifiant.'},format='json')
        self.assertEqual(response.status_code,400)
    def test_smtp_failure_keeps_message_and_success_receipt(self):
        with patch('core.contact.EmailMessage.send',side_effect=OSError('SMTP unavailable')):
            with self.captureOnCommitCallbacks(execute=True):response=self.client.post('/api/contact/',self.body,format='json')
        self.assertEqual(response.status_code,201)
        self.assertFalse(ContactMessage.objects.get().notification_sent)
    def test_csrf_validation_and_private_message_access(self):
        client=APIClient(enforce_csrf_checks=True)
        self.assertEqual(client.post('/api/contact/',self.body,format='json').status_code,403)
        token=client.get('/api/csrf/').data['csrfToken']
        self.assertEqual(client.post('/api/contact/',self.body,format='json',HTTP_X_CSRFTOKEN=token).status_code,201)
        self.assertEqual(client.get('/api/contact/').status_code,405)
        self.assertEqual(client.get('/admin/core/contactmessage/').status_code,302)
    def test_limits_and_honeypot(self):
        for change in [{'email':'invalid'},{'message':'court'},{'message':'x'*4001},{'website':'https://spam.test'}]:
            self.assertEqual(self.client.post('/api/contact/',{**self.body,**change},format='json').status_code,400)
        cache.clear()
        for i in range(5):
            self.assertEqual(self.client.post('/api/contact/',{**self.body,'request_id':str(uuid.uuid4())},format='json').status_code,201)
        self.assertEqual(self.client.post('/api/contact/',{**self.body,'request_id':str(uuid.uuid4())},format='json').status_code,429)
    def test_admin_can_read_and_process_message(self):
        self.client.post('/api/contact/',self.body,format='json')
        staff=User.objects.create_superuser('+23566001122','Contact-Admin!8934',name='Admin')
        self.client.force_login(staff)
        response=self.client.get('/admin/core/contactmessage/')
        self.assertEqual(response.status_code,200)
        self.assertContains(response,'Question sur mon dépôt')
        message=ContactMessage.objects.get()
        self.assertEqual(self.client.get(f'/admin/core/contactmessage/{message.pk}/change/').status_code,200)
