from django.db import models

# Create your models here.
class VideoChatRoom(models.Model):
    room_id = models.CharField(primary_key=True, max_length=100)
    active_members = models.JSONField(default=list)