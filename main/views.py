from chat.models import VideoChatRoom
from main.forms import TeamForm
from django.shortcuts import get_object_or_404, redirect, render
from django.contrib.auth import logout, login
from django.http import HttpResponseRedirect, HttpResponse
from .auth_helper import get_sign_in_url, get_token_from_code, store_token, store_user, remove_user_and_token, get_token
from .graph_helper import get_user
from django.contrib.auth.models import User
from .models import Account, Team
import time

def home(request):
    if request.user.is_authenticated:
        return render(request, 'teams.html')
    else:
        return render(request, 'home.html')


def team(request, team_name):
    team=get_object_or_404(Team, title=team_name)
    return render(request, 'team.html', context={'hide_header':True, 'team':team})


def sign_in(request):
    sign_in_url, state = get_sign_in_url()
    request.session['auth_state'] = state
    return HttpResponseRedirect(sign_in_url)


def aad_callback(request):
    expected_state = request.session.pop('auth_state', '')
    token = get_token_from_code(request.get_full_path(), expected_state)
    user = get_user(token)

    if not User.objects.filter(username=user['mail']).exists():
        new_user = User.objects.create_user(user['mail'])
        new_user.save()
        account = Account()
        account.user = new_user
        account.name = user['displayName']
        account.email = user['mail']
        account.save()

    login(request, User.objects.get(username=user['mail']))

    store_token(request, token)
    return redirect('/')


def sign_out(request):
    remove_user_and_token(request)
    logout(request)
    return redirect('/')


def create_team(request):
    if not request.user.is_authenticated:
        return HttpResponse('Unauthorized', status=401)
    if request.method == 'POST':
        form = TeamForm(request.POST, request.FILES)
        if form.is_valid():
            team = form.save(commit=False)
            video_room = VideoChatRoom()
            video_room.room_id = team.title.lower().replace(' ','-') + '-' + str(int(time.time())) 
            video_room.save()
            team.room = video_room
            team.save()
            team.members.add(request.user)
            team.save()
            return redirect('/team/'+team.title)
    return HttpResponse('Bad Request',status=400)