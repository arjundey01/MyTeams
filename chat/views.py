from django.shortcuts import render, redirect
import time, random
from main.models import Team
from .models import ChatMessage
# Create your views here.
def chatroom(request,room_name):
    try:
        team = Team.objects.get(room = room_name)
        prev_chats = ChatMessage.objects.filter(team = team).order_by('time')
    except Team.DoesNotExist:
        prev_chats=[]
    return render(request, "chat.html",{'room_name':room_name, 'prev_chats':prev_chats})

def start_inst_meet(request):
    room_name = 'instant' + str(random.randrange(100, 999)) + '-' + str(int(time.time()))
    return redirect('/chat/t/'+room_name)
