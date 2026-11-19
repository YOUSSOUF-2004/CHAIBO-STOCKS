import re
import uuid
from decimal import Decimal
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models, transaction
from django.db.models.signals import post_save
from django.dispatch import receiver

MAX_BALANCE = Decimal('900000000000000')

def normalize_phone(value):
    value = re.sub(r'[\s().-]', '', str(value))
    if re.fullmatch(r'\d{8}', value):
        value = '+235' + value
    if not re.fullmatch(r'\+[1-9]\d{7,14}', value):
        raise ValidationError('Numéro invalide. Utilisez le format +23566112233.')
    return value

def photo_path(instance, filename):
    return f'profiles/{instance.pk}/{uuid.uuid4().hex}.jpg'

class UserManager(BaseUserManager):
    use_in_migrations = True
    @transaction.atomic
    def create_user(self, phone, password=None, **extra):
        user = self.model(phone=normalize_phone(phone), **extra)
        user.set_password(password)
        user.save(using=self._db)
        return user
    def create_superuser(self, phone, password=None, **extra):
        extra.setdefault('is_staff', True)
        extra.setdefault('is_superuser', True)
        extra.setdefault('is_active', True)
        if not extra.get('is_staff') or not extra.get('is_superuser') or not extra.get('is_active'):
            raise ValueError('Un superutilisateur doit être actif et administrateur.')
        return self.create_user(phone, password, **extra)

class User(AbstractUser):
    username = None
    first_name = None
    last_name = None
    phone = models.CharField(max_length=16, unique=True)
    name = models.CharField(max_length=150)
    email = models.EmailField(blank=True)
    photo = models.ImageField(upload_to=photo_path, blank=True)
    updated_at = models.DateTimeField(auto_now=True)
    USERNAME_FIELD = 'phone'
    REQUIRED_FIELDS = ['name']
    objects = UserManager()
    def __str__(self):
        return f'{self.name} ({self.phone})'
    def clean(self):
        super().clean()
        self.phone = normalize_phone(self.phone)
    def save(self, *args, **kwargs):
        self.phone = normalize_phone(self.phone)
        super().save(*args, **kwargs)

class Account(models.Model):
    user = models.OneToOneField(User, on_delete=models.PROTECT, related_name='account')
    balance = models.DecimalField(max_digits=18, decimal_places=0, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        constraints = [models.CheckConstraint(condition=models.Q(balance__gte=0, balance__lte=MAX_BALANCE), name='account_balance_in_range')]
    def __str__(self):
        return f'{self.user.phone} — {self.balance} FCFA'

@receiver(post_save, sender=User)
def create_account(sender, instance, created, **kwargs):
    if created:
        Account.objects.create(user=instance)

class Operation(models.Model):
    class Kind(models.TextChoices):
        DEPOSIT = 'deposit', 'Dépôt'
        WITHDRAWAL = 'withdrawal', 'Retrait'
        TRANSFER = 'transfer', 'Transfert'
    class Status(models.TextChoices):
        PENDING = 'pending', 'En attente'
        COMPLETED = 'completed', 'Validé'
        REJECTED = 'rejected', 'Refusé'
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(User, on_delete=models.PROTECT, related_name='operations')
    recipient = models.ForeignKey(User, on_delete=models.PROTECT, null=True, blank=True, related_name='received_operations')
    kind = models.CharField(max_length=12, choices=Kind.choices)
    amount = models.DecimalField(max_digits=18, decimal_places=0, validators=[MinValueValidator(1),MaxValueValidator(MAX_BALANCE)])
    status = models.CharField(max_length=12, choices=Status.choices)
    reference = models.CharField(max_length=200, blank=True)
    idempotency_key = models.UUIDField()
    created_at = models.DateTimeField(auto_now_add=True)
    validated_at = models.DateTimeField(null=True, blank=True)
    validated_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.PROTECT, related_name='validated_operations')
    class Meta:
        ordering = ['-created_at','-id']
        constraints = [models.UniqueConstraint(fields=['owner','idempotency_key'],name='unique_operation_request'),models.CheckConstraint(condition=models.Q(amount__gt=0,amount__lte=MAX_BALANCE),name='operation_positive_amount'),models.CheckConstraint(condition=models.Q(kind='transfer',recipient__isnull=False)|(~models.Q(kind='transfer') & models.Q(recipient__isnull=True)),name='transfer_has_recipient'),models.CheckConstraint(condition=~models.Q(owner=models.F('recipient')),name='no_self_transfer'),models.CheckConstraint(condition=models.Q(kind__in=['deposit','withdrawal','transfer']),name='valid_operation_kind'),models.CheckConstraint(condition=models.Q(status__in=['pending','completed','rejected']),name='valid_operation_status')]
        indexes = [models.Index(fields=['status','created_at'])]

class LedgerEntry(models.Model):
    operation = models.ForeignKey(Operation, on_delete=models.PROTECT, related_name='entries')
    account = models.ForeignKey(Account, on_delete=models.PROTECT, related_name='entries')
    delta = models.DecimalField(max_digits=18,decimal_places=0)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        constraints = [models.UniqueConstraint(fields=['operation','account'],name='one_entry_per_operation_account'),models.CheckConstraint(condition=~models.Q(delta=0),name='ledger_nonzero')]

class LoginWindow(models.Model):
    key = models.CharField(max_length=64, primary_key=True)
    started_at = models.DateTimeField()
    attempts = models.PositiveIntegerField(default=0)

class ContactMessage(models.Model):
    class Status(models.TextChoices):
        NEW = 'new', 'Nouveau'
        IN_PROGRESS = 'in_progress', 'En cours'
        CLOSED = 'closed', 'Traité'
    id = models.UUIDField(primary_key=True,default=uuid.uuid4,editable=False)
    request_id = models.UUIDField(unique=True)
    user = models.ForeignKey(User,null=True,blank=True,on_delete=models.SET_NULL,related_name='contact_messages')
    name = models.CharField(max_length=150)
    email = models.EmailField()
    subject = models.CharField(max_length=150)
    message = models.TextField(max_length=4000)
    status = models.CharField(max_length=20,choices=Status.choices,default=Status.NEW)
    internal_notes = models.TextField(blank=True)
    notification_sent = models.BooleanField(default=False,verbose_name="Notification traitée par le service e-mail")
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'message de contact'
        verbose_name_plural = 'messages de contact'
    def __str__(self):
        return f'{self.subject} — {self.name}'
