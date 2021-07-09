from chat.models import ChatMessage
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import User
from main.models import Team
import json, time

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name=self.scope['url_route']['kwargs']['room_name']
        self.room_group_name='chat_%s'%self.room_name
        self.is_video=False
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()
    
    async def disconnect(self, code):
        if self.is_video and hasattr(self, 'username'):
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_leave',
                    'username': self.username,
                    'name': self.name
                }
            )
            if hasattr(self, 'team'):
                await self.save_message(self.scope['user'].account.name + ' left the video chat.','L')
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        print('recieved', text_data)
        data=json.loads(text_data)

        if data['type']=='message':
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_message',
                    'username': self.username,
                    'text': data.get('text',""),
                    'name': self.name
                }
            )
            await self.save_message(data.get('text'))

        elif data['type']=='login':
            success, username, name = await self.login_user(data.get('name'))
            if not success:
                await self.send(text_data=json.dumps({'type':'login', 'payload':{'success':False}}))
                await self.close()
            else:
                self.username = username
                self.name = name
                self.is_video = data.get('video',False)
                await self.send(text_data=json.dumps({'type':'login', 'payload':{'success':True,'username':username,'name':name}}))
                if self.is_video:
                    await self.channel_layer.group_send(
                        self.room_group_name,
                        {
                            'type': 'chat_join',
                            'username': username,
                            'name': name
                        }
                    )
                    if hasattr(self,'team'):
                        await self.save_message(self.scope['user'].account.name + ' joined the video chat.','J')

        elif data['type']=="offer":
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_offer',
                    'offer': data['offer'],
                    'username': self.username,
                    'target':data['target']
                }
            )

        elif data['type']=="answer":
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_answer',
                    'answer': data['answer'],
                    'username': self.username,
                    'target':data['target']
                }
            )

        elif data['type']=="candidate":
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_candidate',
                    'candidate': data['candidate'],
                    'username': self.username,
                    'target':data['target']
                }
            )

        elif data['type']=="ready":
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_ready',
                    'username': self.username,
                    'target': data['target'],
                    'muted': data['muted']
                }
            )

        elif data['type']=="add-peer":
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_add_peer',
                    'username': self.username,
                    'name': self.name,
                    'target': data['target'],
                    'muted':data['muted']
                }
            )

        elif data['type']=="mute":
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_mute',
                    'username': self.username,
                    'kind': data['kind'],
                    'muted':data['muted']
                }
            )
    
    async def chat_join(self, event):
        if event['username'] != self.username:
            await self.send(text_data=json.dumps({'type':'join', 'payload':{'username':event['username'], 'name':event['name']}}))


    async def chat_message(self, event):
        await self.send(text_data=json.dumps({'type':'message','payload':{
                'username': event['username'],
                'text':event['text'],
                'name':event['name']}}))

    async def chat_offer(self, event):
        if event['target'] == self.username:
            await self.send(text_data=json.dumps({'type':'offer','payload':{
                'username': event['username'],
                'offer':event['offer']}}))
    
    async def chat_answer(self, event):
        if event['target'] == self.username:
            await self.send(text_data=json.dumps({'type':'answer','payload':{
                'username': event['username'],
                'answer':event['answer']}}))
    
    async def chat_candidate(self, event):
        if event['target'] == self.username:
            await self.send(text_data=json.dumps({'type':'candidate','payload':{
                'username': event['username'],
                'candidate':event['candidate']}}))
    
    async def chat_ready(self, event):
        if event['target'] == self.username:
            await self.send(text_data=json.dumps({'type':'ready','payload':{
                'target':event['username'],
                'muted': event['muted']}}))
    
    async def chat_add_peer(self, event):
        if event['target'] == self.username:
            await self.send(text_data=json.dumps({'type':'add-peer','payload':{
                'username':event['username'],
                'name':event['name'],
                'muted': event['muted']}}))

    async def chat_leave(self, event):
        if event['username'] != self.username:
            await self.send(text_data=json.dumps({'type':'leave','payload':{'username':event['username']}}))

    async def chat_mute(self, event):
        if event['username']!=self.username:
            await self.send(text_data=json.dumps({'type':'mute','payload':{
                'username':event['username'], 
                'kind':event['kind'], 
                'muted':event['muted']}}))

    @database_sync_to_async
    def login_user(self, name):
        try:
            team = Team.objects.get(room = self.room_name)
            if self.scope['user'].is_authenticated:
                if self.scope['user'] in team.members.all():
                    self.team = team
                    return [True, self.scope['user'].username, self.scope['user'].account.name]
            return [False,"",""]
        except Team.DoesNotExist:
            if self.scope['user'].is_authenticated:
                return [True, self.scope['user'].username, self.scope['user'].account.name]
            else:
                username = ''.join(list(filter(lambda x:x.isalpha(),name)))
                username = username + '_' + str(int(time.time()))
                return [True,username,name]

    @database_sync_to_async
    def save_message(self, text, type = 'T'):
        if hasattr(self,'team') and self.scope['user'].is_authenticated and len(text):
            chat = ChatMessage()
            chat.user = self.scope['user']
            chat.team = self.team
            chat.type = type
            chat.text = text
            chat.save()
    
