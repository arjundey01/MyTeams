from django.shortcuts import render

# Create your views here.
def home(request):
    if request.user.is_authenticated:
        groups=[{'title':'Group One', 'member_count':5}, {'title':'Machine Learning and Artificial Intelligence', 'member_count':180}]
        return render(request, 'teams.html', context={'groups':groups})
    else:
        return render(request, 'home.html')

def team(request, team_name):
    team={'title':'Microsoft Team', 'members':[{'name':'Arjun Dey'},{'name':'Akshat Arun'},{'name':'Vikram Jitendra Damle'}]}
    return render(request, 'team.html', context={'hide_header':True, 'team':team})
