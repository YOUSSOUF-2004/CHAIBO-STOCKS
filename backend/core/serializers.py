import io
import warnings
from PIL import Image, ImageOps, UnidentifiedImageError
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.files.base import ContentFile
from django.db import transaction, IntegrityError
from rest_framework import serializers
from .models import User, Operation, MAX_BALANCE, normalize_phone

class PhoneField(serializers.CharField):
    def to_internal_value(self, data):
        try:
            return normalize_phone(super().to_internal_value(data))
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.messages)

class ProfileSerializer(serializers.ModelSerializer):
    photo = serializers.SerializerMethodField()
    role = serializers.SerializerMethodField()
    balance = serializers.DecimalField(source='account.balance', max_digits=18,decimal_places=0,read_only=True)
    active = serializers.BooleanField(source='is_active',read_only=True)
    def get_role(self, obj):
        return 'admin' if obj.is_staff else 'client'
    def get_photo(self, obj):
        return f'/api/users/{obj.pk}/photo/?v={obj.updated_at.timestamp()}' if obj.photo else ''
    class Meta:
        model = User
        fields = ['id','name','phone','email','photo','role','balance','active']
        read_only_fields = fields

class RegisterSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=150)
    phone = PhoneField(max_length=40)
    email = serializers.EmailField(required=False,allow_blank=True)
    password = serializers.CharField(write_only=True,max_length=128,trim_whitespace=False)
    def validate(self, attrs):
        if any(field in self.initial_data for field in ['role','is_staff','is_superuser','balance','is_active']):
            raise serializers.ValidationError('Les droits et le solde sont attribués exclusivement par le serveur.')
        candidate = User(name=attrs['name'],phone=attrs['phone'],email=attrs.get('email',''))
        try:
            validate_password(attrs['password'], candidate)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({'password':exc.messages})
        if User.objects.filter(phone=attrs['phone']).exists():
            raise serializers.ValidationError({'phone':'Ce numéro est déjà utilisé.'})
        return attrs
    def create(self, validated_data):
        try:
            with transaction.atomic():
                return User.objects.create_user(**validated_data)
        except IntegrityError:
            raise serializers.ValidationError({'phone':'Ce numéro est déjà utilisé.'})

class ProfileUpdateSerializer(serializers.ModelSerializer):
    # Phone is the login identifier. A verified phone-change flow can be added separately.
    photo = serializers.ImageField(required=False,write_only=True)
    remove_photo = serializers.BooleanField(required=False,write_only=True,default=False)
    def validate(self, attrs):
        if any(k not in ['name','email','photo','remove_photo'] for k in self.initial_data):
            raise serializers.ValidationError('Seuls le nom, l’e-mail et la photo peuvent être modifiés ici.')
        if attrs.get('photo') and attrs.get('remove_photo'):
            raise serializers.ValidationError('Choisissez l’ajout ou la suppression de la photo.')
        return attrs
    def validate_photo(self, upload):
        if upload.size > 5*1024*1024:
            raise serializers.ValidationError('Photo trop volumineuse : 5 Mo maximum.')
        try:
            upload.seek(0)
            with warnings.catch_warnings():
                warnings.simplefilter('error',Image.DecompressionBombWarning)
                with Image.open(upload) as source:
                    if source.format not in ['JPEG','PNG','WEBP'] or source.width*source.height > 20_000_000:
                        raise serializers.ValidationError('Image JPG, PNG ou WebP de 20 millions de pixels maximum attendue.')
                    image = ImageOps.exif_transpose(source)
                    image = ImageOps.fit(image,(384,384))
                    rgba = image.convert('RGBA')
                    rgb = Image.new('RGB',rgba.size,'white')
                    rgb.paste(rgba,mask=rgba.getchannel('A'))
                    output = io.BytesIO()
                    rgb.save(output,'JPEG',quality=85)
            return ContentFile(output.getvalue(),name='profile.jpg')
        except (UnidentifiedImageError,OSError,ValueError,Image.DecompressionBombError,Image.DecompressionBombWarning):
            raise serializers.ValidationError('Image illisible ou trop grande.')
    @transaction.atomic
    def update(self, instance, validated_data):
        # Serialize profile updates so two concurrent uploads preserve the newest name/e-mail.
        instance = User.objects.select_for_update().get(pk=instance.pk)
        old_name = instance.photo.name
        photo = validated_data.pop('photo',None)
        remove = validated_data.pop('remove_photo',False)
        for key,value in validated_data.items():
            setattr(instance,key,value)
        if photo is not None:
            instance.photo = photo
        elif remove:
            instance.photo = ''
        instance.save()
        if old_name and old_name != instance.photo.name:
            storage = instance.photo.storage
            transaction.on_commit(lambda: storage.delete(old_name))
        return instance
    class Meta:
        model = User
        fields = ['name','email','photo','remove_photo']
        extra_kwargs = {'name':{'required':False},'email':{'required':False}}

class OperationCreateSerializer(serializers.Serializer):
    kind = serializers.ChoiceField(choices=Operation.Kind.choices)
    amount = serializers.DecimalField(max_digits=18,decimal_places=0,min_value=1,max_value=MAX_BALANCE)
    idempotency_key = serializers.UUIDField()
    recipient_phone = PhoneField(required=False)
    reference = serializers.CharField(required=False,allow_blank=True,max_length=200)
    def validate(self, attrs):
        phone = attrs.pop('recipient_phone',None)
        if attrs['kind'] == Operation.Kind.TRANSFER:
            if not phone:
                raise serializers.ValidationError({'recipient_phone':'Numéro du bénéficiaire obligatoire.'})
            recipient = User.objects.filter(phone=phone,is_active=True,is_staff=False).first()
            if not recipient:
                raise serializers.ValidationError({'recipient_phone':'Bénéficiaire introuvable ou indisponible.'})
            if recipient.pk == self.context['request'].user.pk:
                raise serializers.ValidationError('Vous ne pouvez pas transférer vers votre propre compte.')
            attrs['recipient'] = recipient
        elif phone:
            raise serializers.ValidationError('Bénéficiaire non autorisé pour cette opération.')
        return attrs

class OperationSerializer(serializers.ModelSerializer):
    owner_name = serializers.CharField(source='owner.name',read_only=True)
    owner_phone = serializers.CharField(source='owner.phone',read_only=True)
    recipient_name = serializers.CharField(source='recipient.name',read_only=True,default='')
    direction = serializers.SerializerMethodField()
    kind_label = serializers.CharField(source='get_kind_display',read_only=True)
    status_label = serializers.CharField(source='get_status_display',read_only=True)
    def get_direction(self,obj):
        user = self.context['request'].user
        return 'credit' if obj.kind == 'deposit' or obj.recipient_id == user.pk else 'debit'
    class Meta:
        model = Operation
        fields = ['id','owner_name','owner_phone','recipient_name','kind','kind_label','amount','direction','status','status_label','reference','created_at','validated_at']
        read_only_fields = fields

class ContactSerializer(serializers.Serializer):
    request_id = serializers.UUIDField()
    name = serializers.CharField(max_length=150)
    email = serializers.EmailField(max_length=254)
    subject = serializers.CharField(max_length=150)
    message = serializers.CharField(min_length=10,max_length=4000)
    website = serializers.CharField(required=False,allow_blank=True,write_only=True)
    def validate_website(self,value):
        if value:
            raise serializers.ValidationError('Envoi refusé.')
        return value
