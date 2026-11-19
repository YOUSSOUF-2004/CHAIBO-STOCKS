import hashlib
from datetime import timedelta
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError, Throttled, PermissionDenied
from .models import Account, Operation, LedgerEntry, LoginWindow, MAX_BALANCE

@transaction.atomic
def reserve_login(phone, ip):
    # Account and source-IP counters are shared by all application workers.
    for raw, limit in sorted([(f'phone:{phone}',10),(f'ip:{ip}',30)]):
        key = hashlib.sha256(raw.encode()).hexdigest()
        now = timezone.now()
        LoginWindow.objects.get_or_create(key=key, defaults={'started_at':now})
        window = LoginWindow.objects.select_for_update().get(key=key)
        if now-window.started_at >= timedelta(minutes=15):
            window.started_at, window.attempts = now, 0
        if window.attempts >= limit:
            raise Throttled(wait=900, detail='Trop de tentatives. Réessayez dans 15 minutes.')
        window.attempts += 1
        window.save(update_fields=['started_at','attempts'])

def check_active(accounts):
    if any(not a.user.is_active for a in accounts):
        raise ValidationError('Un compte concerné est suspendu.')

def write_entry(account, operation, delta):
    new_balance = account.balance + delta
    if new_balance < 0:
        raise ValidationError('Votre solde est insuffisant.')
    if new_balance > MAX_BALANCE:
        raise ValidationError('Le plafond du compte serait dépassé.')
    account.balance = new_balance
    account.save(update_fields=['balance'])
    LedgerEntry.objects.create(account=account, operation=operation, delta=delta)

@transaction.atomic
def create_operation(user, *, kind, amount, idempotency_key, recipient=None, reference=''):
    if kind not in Operation.Kind.values or amount <= 0 or amount > MAX_BALANCE:
        raise ValidationError('Type ou montant invalide.')
    user_ids = sorted({user.pk, *([recipient.pk] if recipient else [])})
    # Every service acquires account locks in the same order to prevent deadlocks.
    accounts = {a.user_id:a for a in Account.objects.select_for_update(of=('self',)).select_related('user').filter(user_id__in=user_ids).order_by('user_id')}
    if len(accounts) != len(user_ids):
        raise ValidationError('Compte introuvable.')
    existing = Operation.objects.filter(owner=user,idempotency_key=idempotency_key).first()
    if existing:
        if (existing.kind,existing.amount,existing.recipient_id,existing.reference)!=(kind,amount,recipient.pk if recipient else None,reference):
            raise ValidationError('Cet identifiant de requête est déjà utilisé pour une autre opération.')
        return existing, False
    check_active(accounts.values())
    if kind == Operation.Kind.TRANSFER and (not recipient or recipient.pk == user.pk):
        raise ValidationError('Choisissez un autre bénéficiaire.')
    if kind != Operation.Kind.TRANSFER and recipient:
        raise ValidationError('Ce type d’opération ne possède pas de bénéficiaire.')
    pending = kind == Operation.Kind.DEPOSIT
    operation = Operation.objects.create(owner=user,kind=kind,amount=amount,recipient=recipient,reference=reference,idempotency_key=idempotency_key,status=Operation.Status.PENDING if pending else Operation.Status.COMPLETED)
    if not pending:
        write_entry(accounts[user.pk], operation, -amount)
        if recipient:
            write_entry(accounts[recipient.pk], operation, amount)
    return operation, True

@transaction.atomic
def decide_deposit(operation_id, actor, approve=True):
    if not actor.is_staff or not actor.is_active:
        raise PermissionDenied()
    snapshot = Operation.objects.filter(pk=operation_id).first()
    if not snapshot:
        raise ValidationError('Opération introuvable.')
    account = Account.objects.select_for_update(of=('self',)).select_related('user').get(user_id=snapshot.owner_id)
    operation = Operation.objects.select_for_update().get(pk=operation_id)
    if operation.kind != Operation.Kind.DEPOSIT:
        raise ValidationError('Seuls les dépôts peuvent être validés.')
    expected = Operation.Status.COMPLETED if approve else Operation.Status.REJECTED
    if operation.status == expected:
        return operation  # A repeated approval never credits a second time.
    if operation.status != Operation.Status.PENDING:
        raise ValidationError('Ce dépôt a déjà fait l’objet d’une décision.')
    if approve:
        check_active([account])
        write_entry(account,operation,operation.amount)
    operation.status = expected
    operation.validated_at = timezone.now()
    operation.validated_by = actor
    operation.save(update_fields=['status','validated_at','validated_by'])
    return operation
