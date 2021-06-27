from django.urls import path,include
from . import views

urlpatterns = [
    path(r't/<room_name>/<username>/',views.chatroom,name='chatroom'),
    path('test/', views.test)
]