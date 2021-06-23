from django.urls import path,include
from . import views

urlpatterns = [
    path(r't/<room_name>/',views.chatroom,name='chatroom'),
]