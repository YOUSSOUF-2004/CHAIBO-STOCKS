import logging
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.conf import settings
from django.db import transaction
from django.db.models import Q, Sum
from django.http import FileResponse
from django.middleware.csrf import get_token
from django.shortcuts import get_object_or_404
from django.utils.decorators import method_decorator
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from rest_framework import status, serializers
from rest_framework.exceptions import ValidationError, PermissionDenied
from rest_framework.pagination import LimitOffsetPagination
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import User, Account, Operation
from .serializers import PhoneField, ProfileSerializer, RegisterSerializer, ProfileUpdateSerializer, OperationCreateSerializer, OperationSerializer
from .security import client_ip
from .services import reserve_login, create_operation, decide_deposit

logger = logging.getLogger('core')

class Page(LimitOffsetPagination):
    max_limit = 200

@method_decorator(ensure_csrf_cookie,name='dispatch')
class CsrfView(APIView):
    permission_classes = [AllowAny]
    def get(self, request):
        return Response({'csrfToken':get_token(request)})

class SessionView(APIView):
    permission_classes = [AllowAny]
    def get(self, request):
        return Response({'authenticated':request.user.is_authenticated,'user':ProfileSerializer(request.user).data if request.user.is_authenticated else None})

class LoginSerializer(serializers.Serializer):
    phone = PhoneField()
    password = serializers.CharField(max_length=128,trim_whitespace=False)

@method_decorator(csrf_protect,name='dispatch')
class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = 'auth'
    def post(self, request):
        data = LoginSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        phone = data.validated_data['phone']
        reserve_login(phone,client_ip(request))
        user = authenticate(request,phone=phone,password=data.validated_data['password'])
        if user is None:
            return Response({'errors':{'detail':'Identifiants incorrects ou compte indisponible.'}},status=401)
        login(request,user)
        return Response(ProfileSerializer(user).data)

@method_decorator(csrf_protect,name='dispatch')
class RegisterView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = 'auth'
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        login(request,user,backend='django.contrib.auth.backends.ModelBackend')
        return Response(ProfileSerializer(user).data,status=201)

class LogoutView(APIView):
    def post(self, request):
        logout(request)
        return Response(status=204)

class ProfileView(APIView):
    throttle_scope = 'write'
    def get(self, request):
        return Response(ProfileSerializer(request.user).data)
    def patch(self, request):
        serializer = ProfileUpdateSerializer(request.user,data=request.data,partial=True)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(ProfileSerializer(user).data)

class PhotoView(APIView):
    def get(self, request, pk):
        if not settings.PHOTOS_ENABLED:
            return Response(status=404)
        if request.user.pk != pk and not request.user.is_staff:
            raise PermissionDenied()
        user = get_object_or_404(User,pk=pk)
        if not user.photo:
            return Response(status=404)
        try:
            response = FileResponse(user.photo.open('rb'),content_type='image/jpeg')
        except FileNotFoundError:
            return Response(status=404)
        response['Content-Disposition'] = 'inline; filename="profile.jpg"'
        return response

class OperationsView(APIView):
    throttle_scope = 'write'
    def get(self, request):
        qs = Operation.objects.select_related('owner','recipient').all()
        if not request.user.is_staff:
            qs = qs.filter(Q(owner=request.user)|Q(recipient=request.user))
        if request.query_params.get('status'):
            qs = qs.filter(status=request.query_params['status'])
        if request.query_params.get('kind'):
            qs = qs.filter(kind=request.query_params['kind'])
        page = Page()
        return page.get_paginated_response(OperationSerializer(page.paginate_queryset(qs,request),many=True,context={'request':request}).data)
    def post(self, request):
        if request.user.is_staff:
            raise PermissionDenied('Utilisez un compte client pour effectuer une opération.')
        serializer = OperationCreateSerializer(data=request.data,context={'request':request})
        serializer.is_valid(raise_exception=True)
        operation, created = create_operation(request.user,**serializer.validated_data)
        return Response(OperationSerializer(operation,context={'request':request}).data,status=201 if created else 200)

class DepositDecisionView(APIView):
    permission_classes = [IsAdminUser]
    throttle_scope = 'write'
    def post(self, request, pk):
        decision = request.data.get('decision')
        if decision not in ['approve','reject']:
            raise ValidationError('Décision attendue : approve ou reject.')
        operation = decide_deposit(pk,request.user,approve=decision=='approve')
        return Response(OperationSerializer(operation,context={'request':request}).data)

class ClientsView(APIView):
    permission_classes = [IsAdminUser]
    throttle_scope = 'write'
    def get(self, request):
        qs = User.objects.filter(is_staff=False).select_related('account').order_by('id')
        search = request.query_params.get('search','').strip()
        if search:
            qs = qs.filter(Q(name__icontains=search)|Q(phone__icontains=search))
        page = Page()
        return page.get_paginated_response(ProfileSerializer(page.paginate_queryset(qs,request),many=True).data)
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(ProfileSerializer(serializer.save()).data,status=201)

class ClientStatusView(APIView):
    permission_classes = [IsAdminUser]
    throttle_scope = 'write'
    @transaction.atomic
    def patch(self, request, pk):
        if type(request.data.get('active')) is not bool or set(request.data) != {'active'}:
            raise ValidationError('Seul le champ booléen active est accepté.')
        # Same lock order as financial operations. An inactive user loses API access.
        account = get_object_or_404(Account.objects.select_for_update(),user_id=pk)
        user = get_object_or_404(User,pk=account.user_id,is_staff=False)
        user.is_active = request.data['active']
        user.save(update_fields=['is_active'])
        return Response(ProfileSerializer(user).data)

class StatsView(APIView):
    permission_classes = [IsAdminUser]
    def get(self, request):
        return Response({'clients':User.objects.filter(is_staff=False).count(),'total_balance':str(Account.objects.filter(user__is_staff=False).aggregate(total=Sum('balance'))['total'] or 0),'pending_deposits':Operation.objects.filter(kind='deposit',status='pending').count(),'operations':Operation.objects.count()})

@method_decorator(csrf_protect,name='dispatch')
class PasswordResetView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = 'auth'
    def post(self, request):
        if not settings.MESSAGING_ENABLED:
            return Response({'detail':'La réinitialisation par e-mail est temporairement indisponible.'},status=503)
        field = serializers.EmailField()
        email = field.run_validation(request.data.get('email'))
        for user in User.objects.filter(email__iexact=email,is_active=True):
            if not user.has_usable_password():
                continue
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            link = f'{settings.FRONTEND_URL}/#/reinitialiser?uid={uid}&token={token}'
            try:
                send_mail('CHAIBO STOCK — Réinitialiser votre mot de passe',f'Pour choisir un nouveau mot de passe, ouvrez ce lien (valide 1 heure) :\n{link}\nSi vous n’êtes pas à l’origine de cette demande, ignorez ce message.',settings.DEFAULT_FROM_EMAIL,[user.email])
            except Exception:
                # Do not reveal whether an account exists when SMTP is unavailable.
                logger.error('Échec de livraison d’un e-mail de réinitialisation.')
        return Response({'detail':'Si un compte actif correspond, un lien de réinitialisation sera envoyé.'})

@method_decorator(csrf_protect,name='dispatch')
class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = 'auth'
    @transaction.atomic
    def post(self, request):
        from django.contrib.auth.password_validation import validate_password
        from django.core.exceptions import ValidationError as DjangoValidationError
        try:
            pk = urlsafe_base64_decode(request.data.get('uid','')).decode()
            user = User.objects.select_for_update().get(pk=pk,is_active=True)
        except (ValueError,TypeError,OverflowError,UnicodeDecodeError,User.DoesNotExist):
            raise ValidationError('Lien invalide ou expiré.')
        if not default_token_generator.check_token(user,request.data.get('token','')):
            raise ValidationError('Lien invalide ou expiré.')
        password = serializers.CharField(min_length=10,max_length=128,trim_whitespace=False).run_validation(request.data.get('password'))
        try:
            validate_password(password,user)
        except DjangoValidationError as exc:
            raise ValidationError({'password':exc.messages})
        user.set_password(password)
        user.save(update_fields=['password'])
        return Response({'detail':'Mot de passe modifié. Reconnectez-vous.'})


class HealthView(APIView):
    permission_classes = [AllowAny]
    def get(self,request):
        from django.db import connection
        try:
            with connection.cursor() as cursor:
                cursor.execute('SELECT 1')
            return Response({'status':'ok'})
        except Exception:
            return Response({'status':'unavailable'},status=503)

@method_decorator(csrf_protect,name='dispatch')
class ContactView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = 'contact'
    def post(self,request):
        if not settings.MESSAGING_ENABLED:
            return Response({'detail':'La messagerie est temporairement indisponible.'},status=503)
        from .models import ContactMessage
        from .serializers import ContactSerializer
        from .contact import notify_support
        serializer = ContactSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = dict(serializer.validated_data)
        data.pop('website',None)
        with transaction.atomic():
            message,created = ContactMessage.objects.get_or_create(request_id=data['request_id'],defaults={**data,'user':request.user if request.user.is_authenticated else None})
            if any(getattr(message,field)!=data[field] for field in ['name','email','subject','message']):
                raise ValidationError('Cet identifiant correspond à un autre envoi. Rechargez le formulaire.')
            if created:
                transaction.on_commit(lambda: notify_support(message.pk))
        return Response({'id':str(message.pk),'detail':'Votre message a été enregistré. Conservez cette référence pour votre suivi.'},status=201 if created else 200)
