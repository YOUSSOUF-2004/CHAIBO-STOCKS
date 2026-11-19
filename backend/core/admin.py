from django import forms
from django.contrib import admin, messages
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.forms import UserCreationForm, UserChangeForm
from django.contrib.admin.forms import AdminAuthenticationForm
from rest_framework.exceptions import APIException
from .models import User, Account, Operation, LedgerEntry
from .services import reserve_login
from .security import client_ip
from .models import normalize_phone
from django.core.exceptions import ValidationError as DjangoValidationError

class CreateUserForm(UserCreationForm):
    class Meta(UserCreationForm.Meta):
        model = User
        fields = ['phone','name','email']

class ChangeUserForm(UserChangeForm):
    class Meta(UserChangeForm.Meta):
        model = User
        fields = '__all__'

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    add_form = CreateUserForm
    form = ChangeUserForm
    list_display = ['phone','name','email','is_active','is_staff']
    search_fields = ['phone','name','email']
    ordering = ['phone']
    fieldsets = [(None,{'fields':['phone','password']}),('Profil',{'fields':['name','email']}),('Accès',{'fields':['is_active','is_staff','is_superuser','groups','user_permissions']}),('Dates',{'fields':['last_login','date_joined']})]
    add_fieldsets = [(None,{'classes':['wide'],'fields':['phone','name','email','password1','password2']})]
    # Photo changes go through the API image validation/re-encoding pipeline.
    readonly_fields = ['last_login','date_joined']

class ReadOnlyAdmin(admin.ModelAdmin):
    def has_add_permission(self,request): return False
    def has_change_permission(self,request,obj=None): return False
    def has_delete_permission(self,request,obj=None): return False

@admin.register(Account)
class AccountAdmin(ReadOnlyAdmin):
    list_display = ['user','balance','created_at']
    search_fields = ['user__phone','user__name']

@admin.register(Operation)
class OperationAdmin(ReadOnlyAdmin):
    list_display = ['id','owner','kind','amount','status','created_at','validated_by']
    list_filter = ['kind','status']
    search_fields = ['owner__phone','reference']
    actions = []
    def get_actions(self,request):
        # Django hides custom actions when change permission is false. They remain
        # available through the React admin API, without direct ledger editing.
        return {}

@admin.register(LedgerEntry)
class LedgerAdmin(ReadOnlyAdmin):
    list_display = ['operation','account','delta','created_at']
    search_fields = ['account__user__phone']

admin.site.site_header = 'CHAIBO STOCK — Administration'
admin.site.site_title = 'CHAIBO STOCK'

class ProtectedAdminLoginForm(AdminAuthenticationForm):
    def clean(self):
        try:
            phone = normalize_phone(self.cleaned_data.get('username',''))
            self.cleaned_data['username'] = phone
        except DjangoValidationError:
            phone = 'invalid'
        try:
            reserve_login(phone,client_ip(self.request))
        except APIException:
            raise forms.ValidationError('Trop de tentatives. Réessayez dans 15 minutes.')
        return super().clean()

admin.site.login_form = ProtectedAdminLoginForm

from .models import ContactMessage

@admin.register(ContactMessage)
class ContactMessageAdmin(admin.ModelAdmin):
    list_display = ['subject','name','email','status','notification_sent','created_at']
    list_filter = ['status','notification_sent','created_at']
    search_fields = ['name','email','subject','message']
    readonly_fields = ['id','request_id','user','name','email','subject','message','notification_sent','created_at']
    fields = readonly_fields + ['status','internal_notes']
    def has_add_permission(self,request):
        return False
