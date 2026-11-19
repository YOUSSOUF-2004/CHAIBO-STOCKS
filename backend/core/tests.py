import io
import tempfile
import uuid
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from decimal import Decimal
from PIL import Image
from django.contrib.auth.tokens import default_token_generator
from django.core import mail
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import close_old_connections, connection, connections
from django.db.models import Sum
from django.test import TestCase, TransactionTestCase, override_settings
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework.test import APIClient
from rest_framework.exceptions import ValidationError, Throttled
from .models import User, Account, Operation, LedgerEntry
from .services import create_operation, decide_deposit, reserve_login

PASSWORD = 'Test-Chaibo-47!Complex'

@override_settings(SECURE_SSL_REDIRECT=False,EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',STORAGES={'default':{'BACKEND':'django.core.files.storage.InMemoryStorage'},'staticfiles':{'BACKEND':'django.contrib.staticfiles.storage.StaticFilesStorage'}})
class ApiTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.alice = User.objects.create_user('+23566000001',PASSWORD,name='Alice',email='alice@example.com')
        cls.bob = User.objects.create_user('+23566000002',PASSWORD,name='Bob')
        cls.admin = User.objects.create_superuser('+23566000003',PASSWORD,name='Admin')
    def setUp(self):
        cache.clear()
        self.client = APIClient()
    def fund(self,user,amount=100):
        op,_=create_operation(user,kind='deposit',amount=Decimal(amount),idempotency_key=uuid.uuid4())
        return decide_deposit(op.pk,self.admin)
    def csrf(self,client):
        return {'HTTP_X_CSRFTOKEN':client.get('/api/csrf/').data['csrfToken']}
    def test_public_health_and_database_failure(self):
        from unittest.mock import patch
        self.assertEqual(self.client.get('/api/health/').status_code,200)
        with patch('django.db.connection.cursor',side_effect=RuntimeError('test database unavailable')):
            response=self.client.get('/api/health/')
            self.assertEqual(response.status_code,503)
            self.assertEqual(response.data,{'status':'unavailable'})

    def test_register_and_no_privilege_escalation(self):
        result=self.client.post('/api/auth/register/',{'phone':'66 00 00 04','name':'New Client','password':PASSWORD,'role':'admin'},format='json')
        self.assertEqual(result.status_code,400)
        result=self.client.post('/api/auth/register/',{'phone':'66 00 00 04','name':'New Client','password':PASSWORD},format='json')
        self.assertEqual(result.status_code,201)
        user=User.objects.get(phone='+23566000004')
        self.assertFalse(user.is_staff)
        self.assertEqual(user.account.balance,0)
        self.assertTrue(user.check_password(PASSWORD))
        self.assertNotIn('password',result.data)
    def test_authentication_csrf_and_logout(self):
        client=APIClient(enforce_csrf_checks=True)
        self.assertEqual(client.post('/api/auth/login/',{'phone':self.alice.phone,'password':PASSWORD}).status_code,403)
        headers=self.csrf(client)
        response=client.post('/api/auth/login/',{'phone':self.alice.phone,'password':PASSWORD},**headers)
        self.assertEqual(response.status_code,200)
        self.assertTrue(response.cookies['sessionid']['httponly'])
        self.assertEqual(client.get('/api/me/').status_code,200)
        self.assertEqual(client.post('/api/auth/logout/').status_code,403)
        self.assertEqual(client.post('/api/auth/logout/',**self.csrf(client)).status_code,204)
        self.assertEqual(client.get('/api/me/').status_code,403)
    def test_registration_csrf_and_untrusted_origin(self):
        client=APIClient(enforce_csrf_checks=True)
        self.assertEqual(client.post('/api/auth/register/',{}).status_code,403)
        self.assertEqual(client.post('/api/auth/login/',{'phone':self.alice.phone,'password':PASSWORD},HTTP_ORIGIN='https://evil.example',**self.csrf(client)).status_code,403)
    def test_login_window_locks_and_password_validation(self):
        for _ in range(10): reserve_login(self.alice.phone,'1.2.3.4')
        with self.assertRaises(Throttled):reserve_login(self.alice.phone,'1.2.3.4')
        response=self.client.post('/api/auth/register/',{'phone':'+23566000004','name':'Weak','password':'1234'})
        self.assertEqual(response.status_code,400)
    def test_profile_cannot_change_role_phone_or_balance(self):
        self.client.force_login(self.alice)
        for body in [{'role':'admin'},{'balance':9999},{'phone':self.bob.phone}]:
            self.assertEqual(self.client.patch('/api/me/',body,format='json').status_code,400)
        self.assertEqual(self.client.patch('/api/me/',{'name':'Alice Updated'},format='json').status_code,200)
    def test_deposit_requires_admin_and_is_idempotent(self):
        self.client.force_login(self.alice)
        body={'kind':'deposit','amount':100,'idempotency_key':str(uuid.uuid4())}
        result=self.client.post('/api/operations/',body,format='json')
        self.assertEqual(result.status_code,201)
        self.assertEqual(Account.objects.get(user=self.alice).balance,0)
        self.assertEqual(self.client.post('/api/operations/',body,format='json').status_code,200)
        url=f'/api/admin/deposits/{result.data["id"]}/decision/'
        self.assertEqual(self.client.post(url,{'decision':'approve'}).status_code,403)
        self.client.force_login(self.admin)
        for _ in range(2):self.assertEqual(self.client.post(url,{'decision':'approve'}).status_code,200)
        self.assertEqual(Account.objects.get(user=self.alice).balance,100)
        self.assertEqual(LedgerEntry.objects.count(),1)
        self.assertEqual(self.client.post(url,{'decision':'reject'}).status_code,400)
    def test_transfer_history_isolation_and_atomic_insufficient_funds(self):
        self.fund(self.alice,100)
        self.client.force_login(self.alice)
        body={'kind':'transfer','amount':120,'recipient_phone':self.bob.phone,'idempotency_key':str(uuid.uuid4())}
        self.assertEqual(self.client.post('/api/operations/',body,format='json').status_code,400)
        self.assertEqual(Operation.objects.count(),1)
        body['amount']=40
        result=self.client.post('/api/operations/',body,format='json')
        self.assertEqual(result.status_code,201)
        self.assertEqual(Account.objects.get(user=self.alice).balance,60)
        self.assertEqual(Account.objects.get(user=self.bob).balance,40)
        self.assertEqual(self.client.post('/api/operations/',body,format='json').status_code,200)
        body['amount']=41
        self.assertEqual(self.client.post('/api/operations/',body,format='json').status_code,400)
        self.client.force_login(self.bob)
        history=self.client.get('/api/operations/').data['results']
        self.assertEqual(len(history),1)
        self.assertEqual(history[0]['direction'],'credit')
        self.assertEqual(self.client.get('/api/admin/clients/').status_code,403)
        self.assertEqual(self.client.patch(f'/api/admin/clients/{self.alice.pk}/',{'active':False},format='json').status_code,403)
    def test_suspension_invalidates_session_and_blocks_deposits(self):
        self.client.force_login(self.alice)
        admin_client=APIClient();admin_client.force_login(self.admin)
        result=admin_client.patch(f'/api/admin/clients/{self.alice.pk}/',{'active':False},format='json')
        self.assertEqual(result.status_code,200)
        self.assertEqual(self.client.get('/api/me/').status_code,403)
        self.alice.refresh_from_db()
        with self.assertRaises(ValidationError):create_operation(self.alice,kind='withdrawal',amount=Decimal(1),idempotency_key=uuid.uuid4())
    def test_invalid_amount_self_transfer_and_rejected_deposit(self):
        self.client.force_login(self.alice)
        for amount in [0,-1,'1.5','900000000000001']:
            self.assertEqual(self.client.post('/api/operations/',{'kind':'deposit','amount':amount,'idempotency_key':str(uuid.uuid4())},format='json').status_code,400)
        self.assertEqual(self.client.post('/api/operations/',{'kind':'transfer','amount':1,'recipient_phone':self.alice.phone,'idempotency_key':str(uuid.uuid4())},format='json').status_code,400)
        op,_=create_operation(self.alice,kind='deposit',amount=Decimal(100),idempotency_key=uuid.uuid4())
        decide_deposit(op.pk,self.admin,approve=False)
        self.assertEqual(Account.objects.get(user=self.alice).balance,0)
        with self.assertRaises(ValidationError):decide_deposit(op.pk,self.admin)
    def test_photo_upload_private_access_replacement_and_remove(self):
        self.client.force_login(self.alice)
        buffer=io.BytesIO();Image.new('RGB',(800,600),'red').save(buffer,'PNG')
        result=self.client.patch('/api/me/',{'photo':SimpleUploadedFile('photo.png',buffer.getvalue(),content_type='image/png')},format='multipart')
        self.assertEqual(result.status_code,200)
        photo_url=result.data['photo'];self.assertTrue(photo_url)
        response=self.client.get(photo_url)
        self.assertEqual(response.status_code,200)
        contents=b''.join(response.streaming_content)
        self.assertEqual(Image.open(io.BytesIO(contents)).size,(384,384))
        self.client.force_login(self.bob)
        self.assertEqual(self.client.get(photo_url).status_code,403)
        self.client.force_login(self.alice)
        self.assertEqual(self.client.patch('/api/me/',{'photo':SimpleUploadedFile('x.png',b'not-image',content_type='image/png')},format='multipart').status_code,400)
        self.assertEqual(self.client.patch('/api/me/',{'remove_photo':True},format='json').status_code,200)
        self.assertEqual(self.client.get(photo_url).status_code,404)
    def test_password_reset_single_use_invalidates_old_password(self):
        self.assertEqual(self.client.post('/api/auth/password-reset/',{'email':self.alice.email}).status_code,200)
        self.assertEqual(len(mail.outbox),1)
        self.assertIn('/#/reinitialiser?',mail.outbox[0].body)
        token=default_token_generator.make_token(self.alice)
        body={'uid':urlsafe_base64_encode(force_bytes(self.alice.pk)),'token':token,'password':'AnotherStrong-Password!58'}
        self.assertEqual(self.client.post('/api/auth/password-reset/confirm/',body).status_code,200)
        self.assertEqual(self.client.post('/api/auth/password-reset/confirm/',body).status_code,400)
        self.alice.refresh_from_db();self.assertFalse(self.alice.check_password(PASSWORD))
    def test_django_admin_login_uses_database_attempt_limit(self):
        from .models import LoginWindow
        result=self.client.post('/admin/login/',{'username':self.admin.phone,'password':'incorrect-password'})
        self.assertEqual(result.status_code,200)
        self.assertEqual(LoginWindow.objects.count(),2)
        result=self.client.post('/admin/login/',{'username':self.admin.phone,'password':PASSWORD})
        self.assertEqual(result.status_code,302)
        self.assertEqual(self.client.get('/admin/').status_code,200)

    def test_session_cookies_are_secure_in_production(self):
        with override_settings(SESSION_COOKIE_SECURE=True,CSRF_COOKIE_SECURE=True):
            response=self.client.post('/api/auth/login/',{'phone':self.alice.phone,'password':PASSWORD})
            self.assertTrue(response.cookies['sessionid']['secure'])
            csrf=self.client.get('/api/csrf/')
            self.assertTrue(csrf.cookies['csrftoken']['secure'])
            self.assertTrue(csrf.cookies['csrftoken']['httponly'])

    def test_admin_clients_no_staff_creation_and_readonly_ledger(self):
        self.client.force_login(self.admin)
        response=self.client.post('/api/admin/clients/',{'name':'Client','phone':'+23566000005','password':PASSWORD},format='json')
        self.assertEqual(response.status_code,201)
        self.assertEqual(response.data['role'],'client')
        self.assertEqual(self.client.get('/api/admin/stats/').status_code,200)
        self.assertEqual(self.client.patch(f'/api/admin/clients/{self.bob.pk}/',{'balance':500},format='json').status_code,400)

@override_settings(SECURE_SSL_REDIRECT=False)
class ConcurrencyTests(TransactionTestCase):
    def setUp(self):
        self.alice=User.objects.create_user('+23566000001',PASSWORD,name='Alice')
        self.bob=User.objects.create_user('+23566000002',PASSWORD,name='Bob')
        self.admin=User.objects.create_superuser('+23566000003',PASSWORD,name='Admin')
        op,_=create_operation(self.alice,kind='deposit',amount=Decimal(100),idempotency_key=uuid.uuid4())
        decide_deposit(op.pk,self.admin)
    def parallel(self,fn):
        barrier=Barrier(2)
        def worker(i):
            close_old_connections()
            try:
                barrier.wait(timeout=10)
                return fn(i)
            finally:connections.close_all()
        with ThreadPoolExecutor(max_workers=2) as pool:
            return list(pool.map(worker,[0,1]))
    def test_two_simultaneous_withdrawals_never_overdraw(self):
        self.assertEqual(connection.vendor,'postgresql')
        def withdraw(i):
            try:
                create_operation(User.objects.get(pk=self.alice.pk),kind='withdrawal',amount=Decimal(80),idempotency_key=uuid.uuid4())
                return True
            except ValidationError:return False
        self.assertEqual(sorted(self.parallel(withdraw)),[False,True])
        account=Account.objects.get(user=self.alice)
        self.assertEqual(account.balance,20)
        self.assertEqual(account.entries.aggregate(total=Sum('delta'))['total'],account.balance)
    def test_simultaneous_duplicate_transfer_only_applies_once(self):
        key=uuid.uuid4()
        def transfer(i):
            return create_operation(User.objects.get(pk=self.alice.pk),kind='transfer',amount=Decimal(60),recipient=User.objects.get(pk=self.bob.pk),idempotency_key=key)[1]
        self.assertEqual(sorted(self.parallel(transfer)),[False,True])
        self.assertEqual(Account.objects.get(user=self.alice).balance,40)
        self.assertEqual(Account.objects.get(user=self.bob).balance,60)
        self.assertEqual(Operation.objects.filter(kind='transfer').count(),1)
    def test_simultaneous_deposit_approval_never_double_credits(self):
        op,_=create_operation(self.bob,kind='deposit',amount=Decimal(50),idempotency_key=uuid.uuid4())
        def approve(i):return decide_deposit(op.pk,User.objects.get(pk=self.admin.pk)).pk
        self.parallel(approve)
        self.assertEqual(Account.objects.get(user=self.bob).balance,50)
        self.assertEqual(LedgerEntry.objects.filter(operation=op).count(),1)
    def test_failed_recipient_credit_rolls_back_sender_and_ledger(self):
        account=Account.objects.get(user=self.bob);account.balance=Decimal('900000000000000');account.save()
        with self.assertRaises(ValidationError):create_operation(self.alice,kind='transfer',amount=Decimal(50),recipient=self.bob,idempotency_key=uuid.uuid4())
        self.assertEqual(Account.objects.get(user=self.alice).balance,100)
        self.assertEqual(Operation.objects.filter(kind='transfer').count(),0)
