import io,json,os,tempfile
from pathlib import Path
from unittest.mock import patch,MagicMock
from django.test import TestCase,SimpleTestCase,override_settings
from django.core.management import call_command
from django.core.management.base import CommandError
from django.core.mail import EmailMessage
from rest_framework.test import APIClient
from .models import User
from .email_backends import BrevoEmailBackend

class BrevoBackendTests(SimpleTestCase):
    @patch.dict(os.environ,{'BREVO_API_KEY':'test-only-key'})
    @patch('core.email_backends.urllib.request.urlopen')
    def test_payload_and_https_transport(self,send):
        send.return_value.__enter__.return_value.status=201
        message=EmailMessage('Réinitialisation','Votre lien','CHAIBO STOCK <sender@example.test>',['client@example.test'],reply_to=['reply@example.test'])
        self.assertEqual(BrevoEmailBackend().send_messages([message]),1)
        request=send.call_args.args[0]
        self.assertEqual(request.full_url,'https://api.brevo.com/v3/smtp/email')
        payload=json.loads(request.data)
        self.assertEqual(payload['sender']['email'],'sender@example.test')
        self.assertEqual(payload['replyTo']['email'],'reply@example.test')
        self.assertEqual(payload['to'],[{'email':'client@example.test'}])
    @patch.dict(os.environ,{'BREVO_API_KEY':'test-only-key'})
    @patch('core.email_backends.urllib.request.urlopen',side_effect=OSError('sensitive-provider-response'))
    def test_provider_failure_is_sanitized(self,send):
        message=EmailMessage('Sujet','Body','sender@example.test',['client@example.test'])
        with self.assertRaisesRegex(RuntimeError,'Impossible de remettre') as caught:
            BrevoEmailBackend().send_messages([message])
        self.assertNotIn('sensitive-provider-response',str(caught.exception))
        self.assertEqual(BrevoEmailBackend(fail_silently=True).send_messages([message]),0)

@override_settings(SECURE_SSL_REDIRECT=False)
class FrontendTests(TestCase):
    def test_frontend_index_and_private_paths(self):
        with tempfile.TemporaryDirectory() as directory:
            Path(directory,'index.html').write_text('<html>CHAIBO STOCK</html>')
            with override_settings(FRONTEND_DIST=Path(directory)):
                response=self.client.get('/')
                self.assertEqual(response.status_code,200)
                self.assertIn(b'CHAIBO STOCK',b''.join(response.streaming_content))
                self.assertIn('no-store',response['Cache-Control'])
                self.assertEqual(self.client.get('/private-media/photo.jpg').status_code,404)
                self.assertEqual(self.client.get('/api/not-a-route/').status_code,404)
    def test_missing_build_does_not_mask_api(self):
        with override_settings(FRONTEND_DIST=Path('/does-not-exist')):
            self.assertEqual(self.client.get('/').status_code,404)
            self.assertEqual(self.client.get('/api/health/').status_code,200)

class BootstrapTests(TestCase):
    @patch.dict(os.environ,{'BOOTSTRAP_ADMIN_PHONE':'+23566001122','BOOTSTRAP_ADMIN_PASSWORD':'Initial-Admin!9384'})
    def test_initial_admin_is_created_once_without_password_reset(self):
        call_command('bootstrap_admin',stdout=io.StringIO())
        user=User.objects.get(phone='+23566001122')
        self.assertTrue(user.is_superuser)
        self.assertTrue(user.check_password('Initial-Admin!9384'))
        with patch.dict(os.environ,{'BOOTSTRAP_ADMIN_PASSWORD':'A-Different-Password!93'}):
            call_command('bootstrap_admin',stdout=io.StringIO())
        user.refresh_from_db()
        self.assertTrue(user.check_password('Initial-Admin!9384'))
    @patch.dict(os.environ,{'BOOTSTRAP_ADMIN_PHONE':'+23566001122','BOOTSTRAP_ADMIN_PASSWORD':'Initial-Admin!9384'})
    def test_existing_client_is_never_promoted(self):
        user=User.objects.create_user('+23566001122','Client-Password!84',name='Client')
        with self.assertRaises(CommandError):call_command('bootstrap_admin',stdout=io.StringIO())
        user.refresh_from_db()
        self.assertFalse(user.is_staff)
