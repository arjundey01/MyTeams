from django.urls import path,include
from . import views

app_name = 'chat'

urlpatterns = [
    path(r't/<room_name>/',views.chatroom,name='chatroom'),
    path('start-instant-meet/',views.start_inst_meet,name='instant-meet')
]