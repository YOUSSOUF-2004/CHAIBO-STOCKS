from django.urls import path
from . import views
urlpatterns = [
    path("contact/",views.ContactView.as_view()),
    path("health/",views.HealthView.as_view()),
    path('csrf/',views.CsrfView.as_view()),
    path('session/',views.SessionView.as_view()),
    path('auth/register/',views.RegisterView.as_view()),
    path('auth/login/',views.LoginView.as_view()),
    path('auth/logout/',views.LogoutView.as_view()),
    path('auth/password-reset/',views.PasswordResetView.as_view()),
    path('auth/password-reset/confirm/',views.PasswordResetConfirmView.as_view()),
    path('me/',views.ProfileView.as_view()),
    path('users/<int:pk>/photo/',views.PhotoView.as_view()),
    path('operations/',views.OperationsView.as_view()),
    path('admin/deposits/<uuid:pk>/decision/',views.DepositDecisionView.as_view()),
    path('admin/clients/',views.ClientsView.as_view()),
    path('admin/clients/<int:pk>/',views.ClientStatusView.as_view()),
    path('admin/stats/',views.StatsView.as_view()),
]
