from chat.models import ChatMessage
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import User
from main.models import Team
import json, time

# A consumer object represents a single websocket connection to a client
# A consumer object can communicate with othe consumer objects by using groups,
# which are handled by Channels using redis backend. A consumer can send a message 
# to its own client or broadcast a message to all the consumers in its group, which then
# may forward it appropriately to their clients.

# The ChatConsumer is a class inheriting the Consumer(AsyncWebsocketConsumer, to be exact) class
# and provides required additional functionalities as a Signalling Channel
# for the front-end chat applications.
class ChatConsumer(AsyncWebsocketConsumer):
    # Initialize properties and add the consumer's channel to the 
    # group of its room name when the client connects
    async def connect(self):
        self.room_name=self.scope['url_route']['kwargs']['room_name']
        self.room_group_name='chat_%s'%self.room_name
        self.is_video=False
        self.username=None
        self.team=None
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()
    
    # Send the leave signal to the group members, save the leave message
    # and remove the channel from the group when client disconnects
    async def disconnect(self, code):
        if self.is_video and self.username:
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_leave',
                    'username': self.username,
                    'name': self.name
                }
            )
            if self.team:
                await self.save_message(self.scope['user'].account.name + ' left the video chat.','L')
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    # Respond or broadcast appropriate message, when a message is recieved from the client
    # See the message type list at the bottom for details
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
                    if self.team:
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
        
        elif data['type']=="screen":
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_screen',
                    'username': self.username,
                    'on': data['on']
                }
            )
    

    # The below functions (with prefix chat_) are handlers for group broadcasts
    # that is, when a consumer sends a message to the group with type being same as the handler function name
    # See the message type list at the bottom of the page for details.

    async def chat_join(self, event):
        if event['username'] != self.username and self.username:
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
        if event['username'] != self.username and self.username:
            await self.send(text_data=json.dumps({'type':'leave','payload':{'username':event['username']}}))

    async def chat_mute(self, event):
        if event['username']!=self.username and self.username:
            await self.send(text_data=json.dumps({'type':'mute','payload':{
                'username':event['username'], 
                'kind':event['kind'], 
                'muted':event['muted']}}))

    async def chat_screen(self, event):
         if event['username']!=self.username and self.username:
            await self.send(text_data=json.dumps({'type':'screen','payload':{
                'username':event['username'], 
                'on':event['on']}}))


    #Check if the user trying to join is authorized to join the room
    #if so return success, username and the display name of the user
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

    # Save the recieved chat message into the database
    @database_sync_to_async
    def save_message(self, text, type = 'T'):
        if self.team and self.scope['user'].is_authenticated and len(text):
            chat = ChatMessage()
            chat.user = self.scope['user']
            chat.team = self.team
            chat.type = type
            chat.text = text
            chat.save()


   
# Message Types and corresponding actions:

# message:  A simple text message. 
#           The message is saved into the database.
#           Broadcasted to the group and forwarded to every client

# login:    A request sent by client to authorize it to join the room.
#           Request is authenticated and username and display name is obtained
#           Response is sent back to the client.
#           Broadcasted to the group and a join message is sent to the clients (except the sender)

# offer:    A SDP offer for RTC connection establishment.
#           Broadcasted to the group and forwarded to the targeted client

# answer:   A SDP answer to an SDP offer for RTC connection establishment.
#           Broadcasted to the group and forwarded to the targeted client

# candidate:A ICE Candidate for RTC connection establishment.
#           Broadcasted to the group and forwarded to the targeted client

# add-peer: A request for the newly joined peer from a peer already in the room to set up for an RTC connection with it.
#           Broadcasted to the group and forwarded to the targeted client.

# ready:    A response to the add-peer message indicatint the peer is ready to be called by the add-peer sender
#           Broadcasted to the group and forwarded to the targeted client

# mute:     A message signalling the sender has changed the mute state of a media stream
#           Broadcasted to the group and forwarded to every client (except the sender)