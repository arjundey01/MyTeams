from django.db import models
from django.contrib.auth.models import User
from django.db.models.fields.related import OneToOneField
from chat.models import VideoChatRoom

class Account(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    logo_url = models.URLField()

    def __str__(self):
        return self.name


class Team(models.Model):
    title = models.CharField(max_length=50)
    room = OneToOneField(VideoChatRoom, on_delete=models.CASCADE, related_name='team')
    members = models.ManyToManyField(User, related_name='teams')
    logo = models.ImageField(upload_to='team-logos/')

    @property
    def logo_url(self):
        if self.logo:
            return self.logo.url
        return None

    @property
    def member_count(self):
        return len(self.members.all())
    
    def __str__(self):
        return self.title