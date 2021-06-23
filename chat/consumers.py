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
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()
    
    async def disconnect(self, code):
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
                    'message': data['message']
                }
            )
        elif data['type']=='login':
            await self.send(json.dumps({'type':'login','payload':{'success':True,'channel':self.channel_name}}))
        elif data['type']=="offer":
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_offer',
                    'offer': data['offer'],
                    'channel_name': self.channel_name
                }
            )
        elif data['type']=="answer":
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_answer',
                    'answer': data['answer'],
                    'channel_name': self.channel_name
                }
            )
        elif data['type']=="candidate":
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_candidate',
                    'candidate': data['candidate'],
                    'channel_name': self.channel_name
                }
            )
        
    
    async def chat_message(self, event):
        message = event['message']
        message = {'type':'message','payload':message}
        await self.send(text_data=json.dumps(message))

    async def chat_offer(self, event):
        if event['channel_name'] != self.channel_name:
            await self.send(text_data=json.dumps({'type':'offer','payload':{'success':True,'offer':event['offer']}}))
    
    async def chat_answer(self, event):
        if event['channel_name'] != self.channel_name:
            await self.send(text_data=json.dumps({'type':'answer','payload':{'success':True,'answer':event['answer']}}))
    
    async def chat_candidate(self, event):
        if event['channel_name'] != self.channel_name:
            await self.send(text_data=json.dumps({'type':'candidate','payload':{'success':True,'candidate':event['candidate']}}))

