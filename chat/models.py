from django.db import models
from django.contrib.auth.models import User
from main.models import Team
# Create your models here.

#This class represents a table in the database to store individual chat messages
#instances of this class are used to create entries in the table
#There are foreign keys to the User and the Team table to identufy the message uniquely
class ChatMessage(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='chats')
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='chats')
    text = models.TextField()
    type = models.CharField(max_length=1, choices=[('T','Text'),('J','Join'),('L','Leave')], default='T')
    time = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return '{0}_{1}_{2}'.format(self.team.title,self.user.username,str(self.id)) 