const localVideo = document.getElementById('local-video');
const remoteVideo = document.getElementById('remote-video');
const callButton = document.getElementById('call-button');
const roomName =  document.getElementById('room-name').textContent;
let selfUsername;
let loggedIn = false;
const RTCPeerConfig = {"iceServers":[{"url":"stun:stun2.1.google.com:19302"}]};

const peers={};
const videoDeviceConstraints = {
    video:true,
    audio:true
}
const muted = {video: false, audio:false};

let localVideoStream;

function Peer(peer_username, was_requested=false, muted_status={audio:false, video:false}){
    this.username = peer_username;
    this.remoteVideo = null;
    this.peerConn = null;
    this.muted = muted_status;
    
    this.createVideo();
    
    this.initConn();
    
    if(was_requested)
        signalingChannel.send(JSON.stringify({type:"ready", target:this.username, muted:getMuteStatus()}));
    else
        signalingChannel.send(JSON.stringify({type:"add-peer", target:this.username, muted:getMuteStatus()}));

}

Peer.prototype.createVideo = function(){
    let temp = document.getElementById("remote-video-temp");
    let remoteVideoEle = temp.content.cloneNode(true);
    $("video", remoteVideoEle).attr('id',`remote-video-${this.username}`);
    $(".video-name", remoteVideoEle).text(this.username);
    $(".video-logo", remoteVideoEle).text(this.username[0].toUpperCase());
    appendVideoElement(remoteVideoEle);
    $(`#remote-video-${this.username}`).parent().on('click', focusVideo);

    this.remoteVideo = document.getElementById(`remote-video-${this.username}`);
    this.remoteStream = new MediaStream();
    this.remoteVideo.srcObject = this.remoteStream;

    this.handleMute({kind:'audio',muted: this.muted.audio});
    this.handleMute({kind:'video',muted: this.muted.video});
}

Peer.prototype.initConn = function(){
    if(this.peerConn!=null){
        this.peerConn.close();
        delete this.peerConn;
    }

    this.peerConn = new RTCPeerConnection(RTCPeerConfig);

    localVideoStream.getTracks().forEach(track=>{
        this.peerConn.addTrack(track, localVideoStream);
    })

    this.peerConn.ontrack= async ({track})=>{
        this.remoteStream.addTrack(track, this.remoteStream);
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

Peer.prototype.handleReady = function({muted}){
    this.handleMute({kind:'audio',muted: muted.audio});
    this.handleMute({kind:'video',muted: muted.video});
    this.call();
}

Peer.prototype.handleCandidate = async function({candidate}){
    if(candidate)
        await this.peerConn.addIceCandidate(new RTCIceCandidate(candidate));
}

Peer.prototype.handleMute = function({kind, muted}){
    this.muted[kind]=muted;
    if(kind=='video'){
        if(muted){
            $('.video-off', this.remoteVideo.parentElement).removeClass('hidden');
            $(this.remoteVideo).addClass('hidden');
        }else{
            $('.video-off', this.remoteVideo.parentElement).addClass('hidden');
            $(this.remoteVideo).removeClass('hidden');
        }
    }
    else{
        if(muted)
            $('.video-muted', this.remoteVideo.parentElement).removeClass('hidden');
        else
            $('.video-muted', this.remoteVideo.parentElement).addClass('hidden');
    }
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
    // this.peerConn.onaddstream = ()=>{};
    // this.peerConn.onicecandidate = ()=>{};
    this.peerConn.close();
    delete this.peerConn;
    delete this.remoteStream;
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
            break;
        case 'message':
            handleMessage(data.payload);
            break;
        case 'mute':
            peers[data.payload.username].handleMute(data.payload);
            break;
        default:
            console.log("Invalid Message");
    }
}

signalingChannel.onerror = (err)=>{
    console.log("Signaling Channel Error: ",err);
}


function handleLogin({success, active}){
    console.log(active);
    if(success){
        if(active.length){
        active.forEach(user => {
            if(user == selfUsername)return;
                const peer = new Peer(user);
                peers[user] = peer;
            });
        }
        $('#lobby').addClass('hidden');
        $('#chat-room').removeClass('hidden');
        $('#local-video-wrp .video-name').text(selfUsername);
        $('#local-video-wrp .video-logo').text(selfUsername[0].toUpperCase());
        loggedIn = true;
    }
    else{
        $('.error-msg').addClass('hidden');
        $('#username-error').removeClass('hidden');
    }
}

handleAddPeer = function({username, muted}){
    if(username == selfUsername)return;
    if(peers[username]){
        peers[username].createVideo();
        peers[username].initConn();
        signalingChannel.send(JSON.stringify({type:"ready", target:username, muted:getMuteStatus()}));
        return;
    }
    const peer = new Peer(username, true, muted);
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
        $('#lobby-video')[0].srcObject = stream;
        localVideo.muted = true;
        localVideoStream = stream;
    }).catch((e)=>{
        console.log(e);
    });
}

function getMuteStatus(){
    muteStatus={};
    localVideoStream.getTracks().forEach(track=>{
        muteStatus[track.kind]=!track.enabled;
    })
    return muteStatus;
}
// $('#add-button').on('click', function(e){
//     let temp = document.getElementById("remote-video-temp");
//     let remoteVideoEle = temp.content.cloneNode(true);
//     $('video',remoteVideoEle)[0].srcObject = localVideoStream;
//     appendVideoElement(remoteVideoEle);
// });

$('#join-button').on('click', function(e){
    selfUsername = $('#username-input').val();
    if(selfUsername != ""){
        signalingChannel.send(JSON.stringify({type:'login', username: selfUsername}));
    }
    else{
        $('.error-msg').addClass('hidden');
        $("#empty-error").removeClass('hidden');
    }
})

$('#chat-input').on('keypress', function(e){
    if(e.keyCode == 13 && $(this).val()!=""){
        signalingChannel.send(JSON.stringify({
            type:'message',
            text:$(this).val()
        }))
        $(this).val("");
    }
});

$('.mute-button').on('click', function(e){
    const kind = $(this).attr('data-kind');
    muted[kind]=!muted[kind];
    localVideoStream.getTracks().forEach(track=>{
        if(track.kind == kind)
            track.enabled = !muted[kind];
    })
    $(`.mute-button[data-kind="${kind}"]`).toggleClass('mute-button-active');
    if(kind=='audio'){
        $('#local-video-wrp .video-muted').toggleClass('hidden');
    }
    else if(kind=='video'){
        $('#local-video-wrp .video-off').toggleClass('hidden');
        $('#local-video-wrp video').toggleClass('hidden');
        $('#lobby-video-wrp .video-off').toggleClass('hidden');
        $('#lobby-video-wrp video').toggleClass('hidden');
    }
    if(loggedIn){
        signalingChannel.send(JSON.stringify({
            type: 'mute',
            kind: kind,
            muted: muted[kind]
        }));
    }
});

$('#hangup-button').on('click', function(e){
    signalingChannel.close();
    $("#chat-room").addClass('hidden');
    $("#thankyou-screen").removeClass('hidden');
})

$('.video-ele').on('click', focusVideo);

function focusVideo(e){
    e.preventDefault();
    if($('#focused-video>div').length){
        $('#video-wrapper')[0].appendChild($('#focused-video>div')[0]);
    }
    $('#focused-video').html("");
    $('#focused-video')[0].appendChild(this);
}