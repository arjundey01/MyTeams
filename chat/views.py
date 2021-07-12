from django.http.response import HttpResponseForbidden
from django.shortcuts import render, redirect
import time, random
from main.models import Team
from .models import ChatMessage

# Return the html page of the chat room, adding previous chats, if any
def chatroom(request,room_name):
    try:
        team = Team.objects.get(room = room_name)
        prev_chats = ChatMessage.objects.filter(team = team).order_by('time')
        if request.user.is_authenticated:
            if request.user not in team.members.all():
                return HttpResponseForbidden()
        else:
            return redirect('/signin/')
    except Team.DoesNotExist:
        prev_chats=[]
    return render(request, "chat.html",{'room_name':room_name, 'prev_chats':prev_chats})

# Create a random chat room name and redirect to the room
# The nomenclature used allows a unique room name every millisecond
def start_inst_meet(request):
    room_name = 'instant' + str(random.randrange(100, 999)) + '-' + str(int(time.time()))
    return redirect('/chat/t/'+room_name)
