from django.urls import path
from . import views

urlpatterns = [
    path('',views.home, name='home'),
    path('team/<team_name>',views.team, name='team'),
]