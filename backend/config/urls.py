from django.contrib import admin
from django.urls import path, include
from core.frontend import index
urlpatterns = [path('',index,name='frontend'),path('admin/', admin.site.urls), path('api/', include('core.urls'))]
