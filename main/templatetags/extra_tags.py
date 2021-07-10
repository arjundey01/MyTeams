from django import template

register = template.Library()

@register.filter(name='user_logo')
def user_logo(value):
    return value.username[0].capitalize()

@register.filter(name='team_logo')
def team_logo(value):
    return value.title[0].capitalize()

@register.filter(name='team_other_name')
def team_other_name(value, arg):
    for member in value.members.all():
        if member!=arg:
            return member.account.name
    return value.title

@register.filter(name='team_other_username')
def team_other_name(value, arg):
    for member in value.members.all():
        if member!=arg:
            return member.username
    return value.title

@register.filter(name='team_other_logo')
def team_other_logo(value, arg):
    for member in value.members.all():
        if member!=arg:
            return member.account.name[0].capitalize()
    return value.title
