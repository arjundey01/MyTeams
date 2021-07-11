const localVideo = document.getElementById('local-video');
const callButton = document.getElementById('call-button');
const roomName =  document.getElementById('room-name').textContent;
let selfUsername;
let selfName;
let loggedIn = false;
const RTCPeerConfig = {iceServers:[{urls:"stun:stun.l.google.com:19302"}, {urls:"stun:stun.services.mozilla.com"}]};

const peers={};
const deviceConstraints = {video: {height:720, width:1280}, audio: true};
const muted = {video: false, audio:false};

let localVideoStream;
let screenStream;

const signalingChannel = new WebSocket(
    'wss://'
    + window.location.host.split(":")[0]
    +":8001"
    + '/ws/chat/'
    + roomName
    + '/'
);

signalingChannel.onopen = ()=>{
    console.log("Connected to signalling server!");
    init();
}

signalingChannel.onmessage = (msg)=>{
    const data = JSON.parse(msg.data);
    console.log("Message:", data.type ,data);
    switch(data.type){
        case 'login':
            handleLogin(data.payload);
            break;
        case 'join':
            handleJoin(data.payload);
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
    alert('Could not connect to the chat server. Please reload the page to retry.');
}

function init(){
    navigator.mediaDevices
    .getUserMedia(deviceConstraints)
    .then((stream)=>{
        localVideo.srcObject = stream;
        $('#lobby-video')[0].srcObject = stream;
        localVideo.muted = true;
        $('#lobby-video')[0].muted = true;
        $('#lobby-video-loading').hide();
        localVideoStream = stream;
    }).catch((e)=>{
        $('#lobby-video-loading').hide();
        $('#lobby-camera-access-err').removeClass('hidden');
        $('#join-button').off('click');
        $('#join-button').removeClass('cursor-pointer');
        $('#join-button').css('opacity','0.5');
        console.log(e);
    });
}

function handleLogin({success, username, name}){
    console.log(username," logging in...");
    if(success){
        selfUsername = username;
        selfName = name;
        $('#lobby').addClass('hidden');
        $('#chat-room').removeClass('hidden');
        $('#local-video-wrp .video-name').text(selfName+' (You)');
        $('#local-video-wrp .video-logo').text(selfName[0].toUpperCase());
        loggedIn = true;
    }
    else{
        $('.error-msg').addClass('hidden');
        $('#login-error').text('Sorry! You are not authorized join this room.');
        $('#login-error').removeClass('hidden');
        $('#join-button').off('click');
        $('#join-button').css('opacity','0.5');
    }
}

function handleJoin({username, name}){
    console.log(name, 'joined!');
    if(username != selfUsername){
        if(peers[username]){
            peers[username].createVideo();
            peers[username].initConn();
            signalingChannel.send(JSON.stringify({type:"add-peer", target:username, muted:peers[username].getLocalMuteStatus()}));
            return;
        }
        const peer = new Peer(username, name, localVideoStream, signalingChannel);
        peers[username] = peer;
    }
}

function handleAddPeer ({username, name, muted}){
    if(!loggedIn)return;
    if(username == selfUsername)return;
    if(peers[username]){
        peers[username].createVideo();
        peers[username].initConn();
        signalingChannel.send(JSON.stringify({type:"ready", target:username, muted:peers[username].getLocalMuteStatus()}));
        return;
    }
    const peer = new Peer(username, name ,localVideoStream, signalingChannel, true, muted);
    peers[username] = peer;
}

function handleMessage({username, text, name}){
    const temp = document.getElementById('chat-msg-temp');
    const p = temp.content.cloneNode(true);
    $('.chat-author',p).text(name);
    $('.chat-text',p).text(text);
    $('#chat-msg-wrp').append(p);
    $('#chat-msg-wrp')[0].scrollTo(0,$('#chat-msg-wrp')[0].scrollHeight);
    if(!$('#chat-panel').hasClass('chat-panel-active')){
        $('#new-msg-indicator').removeClass('hidden');
    };
}

$('#join-button').on('click', function(e){
    login();
});

$('#username-input').on('keypress', function(e){
    if(e.keyCode == 13)
        login();
});

function login(){
    selfName = $('#username-input').val();
    if(selfName != ""){
        signalingChannel.send(JSON.stringify({type:'login', name: selfName, video: true}));
    }
    else{
        $('.error-msg').addClass('hidden');
        $("#empty-error").removeClass('hidden');
    }
}

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

    if(kind=='video' && $('#screen-share').attr('data-state')=='on')
        return;

    muted[kind]=!muted[kind];
    if(muted[kind]){
        localVideoStream.getTracks().forEach(track=>{
            if(track.kind == kind){
                localVideoStream.removeTrack(track);               
                track.stop();
            }
        })
    }else{
        const config = {}
        config[kind]=deviceConstraints[kind];
        navigator.mediaDevices.getUserMedia(config).then((stream)=>{
            localVideoStream.addTrack(stream.getTracks()[0]);
            for(const peer in peers ){
                if(!peers[peer])continue;
                if(!peers[peer].peerConn)continue;
                const senders = peers[peer].peerConn.getSenders();
                console.log(senders);
                var sender = senders.find(function(s) {
                    if(!s.track)return false;
                    return s.track.kind == kind;
                });
                if(sender){
                    sender.replaceTrack(stream.getTracks()[0]);
                }else{
                    console.log(peers[peer].peerConn.addTrack(stream.getTracks()[0]));
                    peers[peer].call();
                }
            };
        });
    }
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
    localVideoStream.getTracks().forEach(track=>{
        track.stop();
    })
    $("#chat-room").addClass('hidden');
    $("#thankyou-screen").removeClass('hidden');
})

$('#screen-share').on('click', async function(e){
    const state = $(this).attr('data-state');
    if(state=='off'){
        onStartScreenShare();
    }else{
        onStopScreenShare();
    }
})

async function onStartScreenShare(){
    try{
        screenStream = await navigator.mediaDevices.getDisplayMedia();
        for(const peer in peers ){
            var sender = peers[peer].peerConn.getSenders().find(function(s) {
                return s.track.kind == 'video';
            });
            sender.replaceTrack(screenStream.getTracks()[0]);
        };
        screenStream.getTracks()[0].onended = onStopScreenShare;
        if(!muted.video){
            $('#local-video-wrp .video-off').toggleClass('hidden');
            $('#local-video-wrp video').toggleClass('hidden');
        }
        $('.mute-button[data-kind="video"]').css('opacity','0.5');
        $('#screen-share').attr('data-state','on');
        $('#screen-share').toggleClass('screen-share-active');
    }catch(e){    
        console.log('Error: Could not capture screen.',e.name);
        if(e.name=="NotAllowedError")
            alert('Sorry, the application does not have permission to access display media.')
        else
            alert('Sorry, some error occured :(');
    }
}

function onStopScreenShare(){
    for(const peer in peers ){
        var sender = peers[peer].peerConn.getSenders().find(function(s) {
            return s.track.kind == 'video';
        });
        sender.replaceTrack(localVideoStream.getVideoTracks()[0]);
    };
    screenStream.getTracks()[0].stop();
    if(!muted.video){
        $('#local-video-wrp .video-off').toggleClass('hidden');
        $('#local-video-wrp video').toggleClass('hidden');
    }
    $('.mute-button[data-kind="video"]').css('opacity','1');
    $('#screen-share').attr('data-state','off');
    $('#screen-share').toggleClass('screen-share-active');
}