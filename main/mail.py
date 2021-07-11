from cryptography import fernet
from django.core.mail import send_mail
from cryptography.fernet import Fernet
from django.conf import settings
from django.template.loader import render_to_string

def send_invitation_mail(user,team):
    fernet = Fernet(settings.EMAIL_ENCRYPTION_KEY)
    enc_msg = '{0}@{1}'.format(user.username, team.room)
    token = fernet.encrypt(enc_msg.encode())
    invite_link = '{0}/accept-invite/{1}/'.format(settings.HOSTNAME,token.decode("utf-8"))
    context = {'title':team.title, 'link':invite_link, 'logo_url': '{0}/static/img/logo.svg'.format(settings.HOSTNAME)}
    msg_plain = render_to_string('invitation-template.txt', context)
    msg_html = render_to_string('invitation-template.html', context)
    send_mail(
        'MyTeams: Team Invitation',
        msg_plain,
        None,
        [user.email],
        fail_silently=False,
        html_message=msg_html
    )