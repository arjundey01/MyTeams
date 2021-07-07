from django.shortcuts import render, redirect
import time, random
# Create your views here.
def chatroom(request,room_name):
    return render(request, "chat.html",{'room_name':room_name})

def start_inst_meet(request):
    room_name = 'instant' + str(random.randrange(100, 999)) + '-' + str(int(time.time()))
    return redirect('/chat/t/'+room_name)
