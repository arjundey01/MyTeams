from django import template

register = template.Library()

@register.filter(name='user_logo')
def user_logo(value):
    return value.username[0].capitalize()

@register.filter(name='team_logo')
def team_logo(value):
    return value['title'][0].capitalize()
