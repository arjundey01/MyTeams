from chat.models import ChatMessage
from django.http.response import HttpResponseBadRequest, HttpResponseForbidden, HttpResponseNotFound
from main.forms import TeamForm
from django.shortcuts import get_object_or_404, redirect, render
from django.contrib.auth import logout, login
from django.contrib.auth.decorators import login_required
from django.http import HttpResponseRedirect, HttpResponse
from .auth_helper import get_sign_in_url, get_token_from_code, store_token, remove_user_and_token
from .graph_helper import get_user
from django.contrib.auth.models import User
from .models import Account, Team
from .mail import send_invitation_mail
from fuzzywuzzy import fuzz
from cryptography.fernet import Fernet
from django.conf import settings
import time, json

# Return the appropriate home page
def home(request):
    if request.user.is_authenticated:
        convs = request.user.teams.filter(is_personal=True)
        teams = request.user.teams.filter(is_personal=False)
        return render(request, 'teams.html', {'convs':convs,'teams':teams})
    else:
        return render(request, 'home.html')


# Return the team page if authorized and team exists
@login_required
def team(request, team_name):
    team=request.user.teams.filter(title = team_name)
    if not team.exists():
        return HttpResponseNotFound()
    team = team.first()
    if request.user in team.members.all():
        chats = ChatMessage.objects.filter(team=team).order_by('time')
        return render(request, 'team.html', context={'team':team, 'chats':chats})
    return HttpResponseForbidden()


# Singin using AAD Oauth
def sign_in(request):
    if request.user.is_authenticated:
        return redirect('/')
    sign_in_url, state = get_sign_in_url()
    request.session['auth_state'] = state
    return HttpResponseRedirect(sign_in_url)


# Callback after obtaining auth token from AAD
def aad_callback(request):
    expected_state = request.session.pop('auth_state', '')
    token = get_token_from_code(request.get_full_path(), expected_state)
    user = get_user(token)
    email = user['mail'] if (user['mail'] != None) else user['userPrincipalName']

    #Create the User and Account entry in database for this user if does not exist.
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

    #Login the user. The user is stored in the session and the session id is stored as cookie in the client.
    login(request, User.objects.get(email=email))

    store_token(request, token)
    return redirect('/')


# Logout the user
def sign_out(request):
    remove_user_and_token(request)
    logout(request)
    return redirect('/')


# Create an entry for the requested team in the database,
# creating an unique room name and adding the requesitng user
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


# Search for users matching the query with the user's name and username
# and return the results in the form of a serialized JSON object
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
    res.sort(reverse=True, key=lambda x:x.get('match',0))
    return HttpResponse(json.dumps(res), status=200)


# Send team invite to a user
# Add the user in the team's invitation list and send invitation email
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

        try:
            send_invitation_mail(user,team)
        except:
            pass

        return HttpResponse('success',status=200)

    return HttpResponseBadRequest()


# Accept team invitation
# Add the user in the team's member list and remove from invitation list
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


# Accept team invitation through email link
# The link has a token as a parameter, 
# which is the symmetric encryption of invitee's username and teams room name.
# The token is decrypted to check if the request is valid, and if so it is processed.
def accept_email_invite(request,token):
    fernet = Fernet(settings.EMAIL_ENCRYPTION_KEY)
    username, room = fernet.decrypt(token.encode()).decode().split('@')
    
    team = get_object_or_404(Team, room=room)
    user = get_object_or_404(User, username=username)

    if request.user.is_authenticated and user!=request.user:
        return HttpResponseForbidden()
    if user in team.members.all():
        return redirect('team',team_name=team.title)
    if user not in team.invited.all():
        return HttpResponseForbidden()

    if len(user.invited_to.all()) == 1:
        user.account.new_notif=False
        user.account.save()
    
    team.invited.remove(user)
    team.members.add(user)

    return redirect('/signin/')


# Decline a team invitation.
# Remove the user from the teams invitation list
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


# Leave the team
# Remove the user from the teams member list       
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


# Unsets the new notification status of the user
# When a user opens the notifications in the client, this is requested
def seen_notif(request):
    if not request.user.is_authenticated:
        return HttpResponse('Unauthorized', status=401)
    if request.method == 'POST':
        request.user.account.new_notif=False
        request.user.account.save()
        return HttpResponse('success',status=200)
    return HttpResponseBadRequest()


# Start a personal one-to-one conversation with a user
# Create a team (personal) entry if not already there with room name
# Add both the users in team if not there
# return the User Chat page
@login_required
def user_chat(request, username):
    if username == request.user.username:
        redirect('/')
    user = get_object_or_404(User, username=username)
    team = None
    for tm in user.teams.all():
        if tm.member_count == 2 and request.user in tm.members.all() and tm.is_personal:
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