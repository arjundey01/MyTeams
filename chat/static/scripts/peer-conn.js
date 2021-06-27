const localVideo = document.getElementById('local-video');
const remoteVideo = document.getElementById('remote-video');
const callButton = document.getElementById('call-button');
const roomName =  document.getElementById('room-name').textContent;
const selfUsername =  document.getElementById('username').textContent;
const RTCPeerConfig = {"iceServers":[{"url":"stun:stun2.1.google.com:19302"}]};
const peers={};
const videoDeviceConstraints = {
    video:true
}

let localVideoStream;

function Peer(peer_username, was_requested=false){
    this.username = peer_username;
    
    this.createVideo();

    this.peerConn = new RTCPeerConnection(RTCPeerConfig);

    this.initConn();
    
    if(was_requested)
        signalingChannel.send(JSON.stringify({type:"ready", target:this.username}));
    else
        signalingChannel.send(JSON.stringify({type:"add-peer", target:this.username}));

}

Peer.prototype.createVideo = function(){
    let temp = document.getElementById("remote-video-temp");
    let remoteVideoEle = temp.content.cloneNode(true);
    remoteVideoEle.querySelector("video").setAttribute('id',`remote-video-${this.username}`);
    appendVideoElement(remoteVideoEle);
    this.remoteVideo = document.getElementById(`remote-video-${this.username}`);
}

Peer.prototype.initConn = function(){
    this.peerConn.addStream(localVideoStream);
    this.peerConn.onaddstream = (e)=>{
        this.remoteVideo.srcObject = e.stream;
        $(this.remoteVideo).parent().removeClass('hidden');
    }
    this.peerConn.onicecandidate = (e)=>{
        console.log('ICECANDIDATE',e.candidate);
        if(e.candidate){
            signalingChannel.send(JSON.stringify({type:"candidate",candidate: e.candidate, target:this.username}));
        }
    }
}

Peer.prototype.handleOffer = function({offer, username}){
    this.peerConn.setRemoteDescription(new RTCSessionDescription(offer));
    this.peerConn.createAnswer((answer)=>{
        this.peerConn.setLocalDescription(answer);
        signalingChannel.send(JSON.stringify(
            {type:'answer', answer:answer, target:username}
        ));
    }, function(e){
        console.log("Could not create answer: ", e);
    });
}

Peer.prototype.handleAnswer = function({answer}){
    this.peerConn.setRemoteDescription(new RTCSessionDescription(answer));
}

Peer.prototype.handleReady = function(){
    this.call();
}

Peer.prototype.handleCandidate = function({candidate}){
    this.peerConn.addIceCandidate(new RTCIceCandidate(candidate));
}

Peer.prototype.call = function(){
    this.peerConn.createOffer((offer)=>{
        signalingChannel.send(JSON.stringify(
            {type:'offer', offer:offer, target:this.username}
        ));
        this.peerConn.setLocalDescription(offer);
    },function(e){
        console.log("Could not create offer: ",e);
    })
}

Peer.prototype.handleLeave = function(){
    this.peerConn.onaddstream = ()=>{};
    this.peerConn.onicecandidate = ()=>{};
    $(this.remoteVideo).parent().remove();
    updateVideoContainerLayout();
}

const signalingChannel = new WebSocket(
    'wss://'
    + window.location.host.split(":")[0]
    +":8001"
    + '/ws/chat/'
    + roomName
    + '/'
    + selfUsername
    + '/'
);

signalingChannel.onopen = ()=>{
    console.log("Connected to signalling server!");
    init();
}

signalingChannel.onmessage = (msg)=>{
    console.log("Message:",msg.data);
    const data = JSON.parse(msg.data);
    switch(data.type){
        case 'login':
            handleLogin(data.payload);
            break;
        case 'add-peer':
            handleAddPeer(data.payload);
            break;
        case 'offer':
            peers[data.payload.username].handleOffer(data.payload);
            break;
        case 'answer':
            peers[data.payload.username].handleAnswer(data.payload);
            break;
        case 'candidate':
            peers[data.payload.username].handleCandidate(data.payload);
            break;
        case 'leave':
            peers[data.payload.username].handleLeave(data.payload);
            break;
        case 'ready':
            peers[data.payload.target].handleReady(data.payload);
        case 'message':
            handleMessage(data.payload);
            break;
        default:
            console.log("Invalid Message");
    }
}

signalingChannel.onerror = (err)=>{
    console.log("Signaling Channel Error: ",err);
}


function handleLogin({success, channel, active}){
    console.log(channel,active);
    if(success && active.length){
        active.forEach(user => {
            if(user == selfUsername)return;
            const peer = new Peer(user);
            peers[user] = peer;
        });
    }
}

handleAddPeer = function({username}){
    if(username == selfUsername)return;
    if(peers[username]){
        peers[username].createVideo();
        peers[username].initConn();
        signalingChannel.send(JSON.stringify({type:"ready", target:username}));
        return;
    }
    const peer = new Peer(username, true);
    peers[username] = peer;
}

function handleMessage({username, text}){
    const temp = document.getElementById('chat-msg-temp');
    const p = temp.content.cloneNode(true);
    $('.chat-author',p).text(username);
    $('.chat-text',p).text(text);
    $('#chat-msg-wrp').append(p);
}

function init(){
    navigator.mediaDevices.getUserMedia(videoDeviceConstraints).then((stream)=>{
        localVideo.srcObject = stream;
        localVideoStream = stream;
        signalingChannel.send(JSON.stringify({type:'login'}));
    }).catch((e)=>{
        console.log(e);
    });
}

// $('#add-button').on('click', function(e){
//     let temp = document.getElementById("remote-video-temp");
//     let remoteVideoEle = temp.content.cloneNode(true);
//     $('video',remoteVideoEle)[0].srcObject = localVideoStream;
//     appendVideoElement(remoteVideoEle);
// });

$('#chat-input').on('keypress', function(e){
    if(e.keyCode == 13 && $(this).val()!=""){
        signalingChannel.send(JSON.stringify({
            type:'message',
            text:$(this).val()
        }))
        $(this).val("");
    }
})