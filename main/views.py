from chat.models import ChatMessage
from django.http.response import Http404, HttpResponseBadRequest, HttpResponseForbidden
from main.forms import TeamForm
from django.shortcuts import get_object_or_404, redirect, render
from django.contrib.auth import logout, login
from django.contrib.auth.decorators import login_required
from django.http import HttpResponseRedirect, HttpResponse, request
from .auth_helper import get_sign_in_url, get_token_from_code, store_token, store_user, remove_user_and_token, get_token
from .graph_helper import get_user
from django.contrib.auth.models import User
from .models import Account, Team
from fuzzywuzzy import fuzz
import time, json

def home(request):
    if request.user.is_authenticated:
        convs = request.user.teams.filter(is_personal=True)
        teams = request.user.teams.filter(is_personal=False)
        return render(request, 'teams.html', {'convs':convs,'teams':teams})
    else:
        return render(request, 'home.html')

@login_required
def team(request, team_name):
    team=request.user.teams.filter(title = team_name)
    if not team.exists():
        return Http404()
    team = team.first()
    if request.user in team.members.all():
        chats = ChatMessage.objects.filter(team=team).order_by('time')
        return render(request, 'team.html', context={'team':team, 'chats':chats})
    return HttpResponseForbidden()


def sign_in(request):
    sign_in_url, state = get_sign_in_url()
    request.session['auth_state'] = state
    return HttpResponseRedirect(sign_in_url)


def aad_callback(request):
    expected_state = request.session.pop('auth_state', '')
    token = get_token_from_code(request.get_full_path(), expected_state)
    user = get_user(token)
    email = user['mail'] if (user['mail'] != None) else user['userPrincipalName']
    if not User.objects.filter(email=email).exists():
        new_user = User()
        tmp = email.split('@')[0:2]
        new_user.username = '_'.join(['_'.join(tmp[0].split('.')),tmp[1].split('.')[0]])
        new_user.email = email
        new_user.save()
        account = Account()
        account.user = new_user
        account.name = user['displayName']
        account.email = email
        account.save()

    login(request, User.objects.get(email=email))

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
            if request.user.teams.filter(title = team.title).exists():
                return HttpResponse('Already Exists',status=400)
            team.room = team.title.lower().replace(' ','-') + '-' + str(int(time.time())) 
            team.save()
            team.members.add(request.user)
            team.save()
            return redirect('/team/'+team.title)
    return HttpResponse('Bad Request',status=400)


def search_user(request):
    query = request.GET.get('query','').lower()
    res=[]
    for user in User.objects.all():
        if user!=request.user:
            match = max(fuzz.partial_ratio(user.account.name.lower(), query),
                         fuzz.partial_ratio(user.username.lower(), query))
            if match>70:
                entry={'username':user.username, 'name':user.account.name, 'match':match}
                res.append(entry)
    print(res)
    # res.sort(reverse=True, key=lambda x:x.match)
    return HttpResponse(json.dumps(res), status=200)


def invite(request):
    if not request.user.is_authenticated:
        return HttpResponse('Unauthorized', status=401)
    if request.method == 'POST':
        print(request.POST)
        team = get_object_or_404(Team, pk=request.POST.get('team_id'))
        user = get_object_or_404(User, username = request.POST.get('username'))
        
        if user in team.members.all():
            return HttpResponseBadRequest()
        if request.user not in team.members.all():
            return HttpResponseForbidden()
        
        team.invited.add(user)

        user.account.new_notif=True
        user.account.save()

        return HttpResponse('success',status=200)

    return HttpResponseBadRequest()


def accept_invite(request):
    if not request.user.is_authenticated:
        return HttpResponse('Unauthorized', status=401)
    if request.method == 'POST':
        team = get_object_or_404(Team, pk=request.POST.get('team_id'))
       
        if request.user in team.members.all():
            return HttpResponseBadRequest()
        if request.user not in team.invited.all():
            return HttpResponseForbidden()
        
        team.invited.remove(request.user)
        team.members.add(request.user)

        return HttpResponse('success',status=200)

    return HttpResponseBadRequest()


def decline_invite(request):
    if not request.user.is_authenticated:
        return HttpResponse('Unauthorized', status=401)
    if request.method == 'POST':
        team = get_object_or_404(Team, pk=request.POST.get('team_id'))
       
        if request.user in team.members.all():
            return HttpResponseBadRequest()
        if request.user not in team.invited.all():
            return HttpResponseBadRequest()
        
        team.invited.remove(request.user)
        return HttpResponse('success',status=200)

    return HttpResponseBadRequest()

        
def leave_team(request):
    if not request.user.is_authenticated:
        return HttpResponse('Unauthorized', status=401)
    if request.method == 'POST':
        team = get_object_or_404(Team, pk=request.POST.get('team_id'))
       
        if request.user not in team.members.all():
            return HttpResponseBadRequest()
        
        team.members.remove(request.user)
        return HttpResponse('success',status=200)

    return HttpResponseBadRequest()


def seen_notif(request):
    if not request.user.is_authenticated:
        return HttpResponse('Unauthorized', status=401)
    if request.method == 'POST':
        request.user.account.new_notif=False
        request.user.account.save()
        return HttpResponse('success',status=200)
    return HttpResponseBadRequest()

@login_required
def user_chat(request, username):
    if username == request.user.username:
        redirect('/')
    user = get_object_or_404(User, username=username)
    team = None
    for tm in user.teams.all():
        if tm.member_count == 2 and request.user in tm.members.all():
            team = tm
            break
    if not team:
        team = Team()
        team.title = 'personal-{0}-{1}'.format(user.username, request.user.username)
        team.room = 'personal-{0}-{1}'.format(user.username, request.user.username)
        team.is_personal=True
        team.save()
        team.members.add(user, request.user)
    chats = ChatMessage.objects.filter(team=team).order_by('time')
    return render(request, 'user-chat.html', context={'team':team, 'chats':chats, 'other':user})