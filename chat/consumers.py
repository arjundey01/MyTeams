from chat.models import VideoChatRoom
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import User
import json
from datetime import datetime
from django.core.serializers.json import DjangoJSONEncoder

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name=self.scope['url_route']['kwargs']['room_name']
        self.room_group_name='chat_%s'%self.room_name
        self.username = self.scope['url_route']['kwargs']['username']
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()
    
    async def disconnect(self, code):
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_leave',
                'username': self.username,
            }
        )
        await self.logout_user(self.username)
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
                    'text': data['text']
                }
            )
        elif data['type']=='login':
            active = await self.login_user(self.username)
            await self.send(json.dumps(
                {
                    'type':'login',
                    'payload':{'success':True,'channel_name':self.channel_name, 'active':active}
                })
            )
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
                    'target': data['target']
                }
            )
        elif data['type']=="add-peer":
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_add_peer',
                    'username': self.username,
                    'target': data['target']
                }
            )


    async def chat_message(self, event):
        await self.send(text_data=json.dumps({'type':'message','payload':{
                'username': event['username'],
                'text':event['text']}}))

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
            await self.send(text_data=json.dumps({'type':'ready','payload':{'target':event['username']}}))
    
    async def chat_add_peer(self, event):
        if event['target'] == self.username:
            await self.send(text_data=json.dumps({'type':'add-peer','payload':{'username':event['username']}}))

    async def chat_leave(self, event):
        if event['username'] != self.username:
            print('leaving...')
            await self.send(text_data=json.dumps({'type':'leave','payload':{'username':event['username']}}))


    @database_sync_to_async
    def login_user(self,user):
        v_room, created = VideoChatRoom.objects.get_or_create(name = self.room_group_name)
        active = v_room.active_members
        if user in active:
            active.remove(user)
        new_active = set(active[:])
        new_active.add(user)
        v_room.active_members = list(new_active)
        v_room.save()
        return list(active)
    
    @database_sync_to_async
    def logout_user(self,user):
        try:
            v_room = VideoChatRoom.objects.get(name = self.room_group_name)
            active = v_room.active_members
            if user in active:
                active.remove(user)
            v_room.active_members = active
            v_room.save()
            return
        except VideoChatRoom.DoesNotExist:
            return
