from django.urls import path
from . import views

urlpatterns = [
    path('',views.home, name='home'),
    path('team/<team_name>/',views.team, name='team'),
    path('signin/', views.sign_in, name='signin'),
    path('aad-callback/', views.aad_callback, name='aad-callback'),
    path('signout/',views.sign_out, name='signout'),
    path('create-team/',views.create_team, name='create-team'),
    path('search/',views.search_user, name='search-user'),
    
    path('invite/',views.invite, name='invite'),
    path('accept-invite/',views.accept_invite, name='accept-invite'),
    path('decline-invite/',views.decline_invite, name='decline-invite'),
    path('leave-team/',views.leave_team, name='leave-team'),
    path('seen-notif/',views.seen_notif, name='seen-notif'),
    path('chat/u/<username>/', views.user_chat, name='user-chat'),
]