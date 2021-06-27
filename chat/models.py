from django.contrib.auth.models import User
from django.db import models

# Create your models here.
class VideoChatRoom(models.Model):
    name = models.CharField(primary_key=True, max_length=100)
    members = models.ManyToManyField(User, related_name='video_chat_rooms')
    active_members = models.JSONField(default=list)