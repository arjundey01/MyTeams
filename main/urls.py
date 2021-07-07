from django.urls import path
from . import views

urlpatterns = [
    path('',views.home, name='home'),
    path('team/<team_name>/',views.team, name='team'),
    path('signin/', views.sign_in, name='signin'),
    path('aad-callback/', views.aad_callback, name='aad-callback'),
    path('signout/',views.sign_out, name='signout'),
    path('create-team/',views.create_team, name='create-team'),
]