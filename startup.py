from chat.models import VideoChatRoom

for room in VideoChatRoom.objects.all():
    room.delete()