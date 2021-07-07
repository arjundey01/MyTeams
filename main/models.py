from django.db import models
from django.contrib.auth.models import User
from django.db.models.fields import CharField
class Account(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    logo_url = models.URLField(blank=True, null=True)

    def __str__(self):
        return self.name


class Team(models.Model):
    title = models.CharField(max_length=50)
    room = CharField(max_length=100)   
    members = models.ManyToManyField(User, related_name='teams')
    logo = models.ImageField(upload_to='team-logos/', blank=True, null=True)

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