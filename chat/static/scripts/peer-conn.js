/**The HTML element representing the local video*/
const localVideo = document.getElementById('local-video');
/**The room name of the chat room*/
const roomName =  document.getElementById('room-name').textContent;

//The local user's username, name and logged in status
let selfUsername;
let selfName;
let loggedIn = false;

/**The RTCPeerConnection configuration object, containing the list of ICE Servers */
const RTCPeerConfig = {iceServers:[{urls:"stun:stun.l.google.com:19302"}, {urls:"stun:stun.services.mozilla.com"}]};

/**A dictionary containing username-Peer key-value pairs, of the added peers */
const peers={};

/**Local media device constraints */
const deviceConstraints = {video: true, audio: true};
const muted = {video: false, audio:false};

//MediaStream objects representing the local video-audio input and screen video input respectively
let localVideoStream;
let screenStream;

/**The websocket signalling channel used to communicate between the peers before the direct p2p connection is established*/
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
        case 'screen':
            peers[data.payload.username].handleScreen(data.payload);
            break;
        default:
            console.log("Invalid Message");
    }
}

signalingChannel.onerror = (err)=>{
    console.log("Signaling Channel Error: ",err);
    alert('Could not connect to the chat server. It may be a security issue. Please close and reopen your browser window and then retry.');
}

/**
 * Initialize the local video-audio stream and video elements
 */
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

/**Handle the 'login' signal. 
 * The 'login' signal authorizes the user to join in the video chat room,
 * after the 'login' request is sent by the peer to the server by pressing the 'Join' button
 * @param {{success:boolean, username:string, name:string}} description Object representing the success of the login,
 * and the username and the name of the local user.
 */
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

/**
 * Handle the 'join' signal.
 * The 'join' signal is sent when a new peer joins the room.
 * @param {{username:string, name:string}} description Object containing the username and the name of the peer joined 
 */
function handleJoin({username, name}){
    console.log(name, 'joined!');
    if(username != selfUsername){

        //If a Peer object already exists correspoding to the peer joined, then re-initialize the peer 
        //else create a new one.
        //Then send a request to the new peer to create a Peer object
        //corresponding to the local peer by sending the 'add-peer' signal (impicit if new Peer is created)

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

/**
 * Handle the 'add-peer' signal.
 * The 'add-peer' signal is sent in response to the 'join' signal when a new peer joins the room.
 * This signal instructs the joined peer to create a new Peer object corresponding to remote peer.
 * @param {{username:string, name:string, muted:{audio:boolean, video:boolean}}} description Object
 * containing the username, name, and muted status of the remote peer 
 */
function handleAddPeer ({username, name, muted}){
    if(!loggedIn)return;
    if(username == selfUsername)return;

    //If a Peer object already exists correspoding to the peer joined, then re-initialize the peer 
    //else create a new one.
    //Then send a 'ready' signal to the remote indicating that the local peer is ready to be called
    //This is impicit if new Peer is created, with was_requested parameter as true

    if(peers[username]){
        peers[username].createVideo();
        peers[username].initConn();
        signalingChannel.send(JSON.stringify({type:"ready", target:username, muted:peers[username].getLocalMuteStatus()}));
        return;
    }
    const peer = new Peer(username, name ,localVideoStream, signalingChannel, true, muted);
    peers[username] = peer;
}

/**Handle recieving a chat message. */
function handleMessage({username, text, name}){

    //Create new message element and append to the messages panel
    const temp = document.getElementById('chat-msg-temp');
    const p = temp.content.cloneNode(true);
    $('.chat-author',p).text(name);
    $('.chat-text',p).text(text);
    $('#chat-msg-wrp').append(p);
    $('#chat-msg-wrp')[0].scrollTo(0,$('#chat-msg-wrp')[0].scrollHeight);

    //Show the new message indicator, if messages panel is closed 
    if(!$('#chat-panel').hasClass('chat-panel-active')){
        $('#new-msg-indicator').removeClass('hidden');
    };
}


//Login when the join button is clicked or Enter is pressed inside the display name input.
$('#join-button').on('click', function(e){
    login();
});

$('#username-input').on('keypress', function(e){
    if(e.keyCode == 13)
        login();
});

/**Send the 'login' signal*/
function login(){
    selfName = $('#username-input').val();
    if(selfName.trim() != ""){
        signalingChannel.send(JSON.stringify({type:'login', name: selfName, video: true}));
    }
    else{
        $('.error-msg').addClass('hidden');
        $("#empty-error").removeClass('hidden');
    }
}

//Send a chat message, if Enter pressed while in chat input 
$('#chat-input').on('keypress', function(e){
    if(e.keyCode == 13 && $(this).val().trim()!=""){
        signalingChannel.send(JSON.stringify({
            type:'message',
            text:$(this).val()
        }))
        $(this).val("");
    }
});

//Add handler for mute button clicks
$('.mute-button').on('click', function(e){
    const kind = $(this).attr('data-kind');

    if(kind=='video' && $('#screen-share').attr('data-state')=='on')
        return;

    muted[kind]=!muted[kind];

    if(muted[kind]){
        //If the track was muted, remove and stop the track from the local video-audio stream
        localVideoStream.getTracks().forEach(track=>{
            if(track.kind == kind){
                localVideoStream.removeTrack(track);               
                track.stop();
            }
        })
    }else{
        //If the track was unmuted, produce a new stream containing the unmuted track,
        //and add it to all the peer connections
        const config = {}
        config[kind]=deviceConstraints[kind];
        
        navigator.mediaDevices.getUserMedia(config).then((stream)=>{
            
            localVideoStream.addTrack(stream.getTracks()[0]);
            
            for(const peer in peers ){
                if(!peers[peer])continue;
                if(!peers[peer].peerConn)continue;

                const senders = peers[peer].peerConn.getSenders();

                var sender = senders.find(function(s) {
                    if(!s.track)return false;
                    return s.track.kind == kind;
                });

                //If a sender with the intended kind exists, replace its track with the new one;
                //Else add the track creating a new sender, renegotiation is required in this case, so call again
                if(sender){
                    sender.replaceTrack(stream.getTracks()[0]);
                }else{
                    peers[peer].peerConn.addTrack(stream.getTracks()[0]);
                    peers[peer].call();
                }

            };
        });
    }

    //Update the UI
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

    //Send 'mute' signal to the connected peers
    if(loggedIn){
        signalingChannel.send(JSON.stringify({
            type: 'mute',
            kind: kind,
            muted: muted[kind]
        }));
    }
});

//Handle hangup, by closing the signalling channel and stopping each track.
//When the signalling channel is closed, 
//a 'leave' signal is sent to the other peers by the server
$('#hangup-button').on('click', function(e){
    signalingChannel.close();
    localVideoStream.getTracks().forEach(track=>{
        track.stop();
    })
    $("#chat-room").addClass('hidden');
    $("#thankyou-screen").removeClass('hidden');
})

//Toggle screen share
$('#screen-share').on('click', async function(e){
    const state = $(this).attr('data-state');
    if(state=='off'){
        onStartScreenShare();
    }else{
        onStopScreenShare();
    }
})

/**Start screen sharing, muting the camera video. */
async function onStartScreenShare(){
    try{
        //Get the display media(screen) input 
        screenStream = await navigator.mediaDevices.getDisplayMedia();

        //Replace the video track of each peer, with the screen track
        for(const peer in peers ){
            if(!peers[peer])continue;
            if(!peers[peer].peerConn)continue;

            var sender = peers[peer].peerConn.getSenders().find(function(s) {
                if(!s.track)return false;
                return s.track.kind == 'video';
            });

            //If a sender with the kind video exists, replace its track with the screen one;
            //Else add the track creating a new sender, renegotiation is required in this case, so call again
            if(sender){
                sender.replaceTrack(screenStream.getTracks()[0]);
            }else{
                peers[peer].peerConn.addTrack(screenStream.getTracks()[0]);
                peers[peer].call();
            }
        };

        //Handle ending of track by some external agent
        screenStream.getTracks()[0].onended = onStopScreenShare;

        //Update the UI
        if(!muted.video){
            $('#local-video-wrp .video-off').removeClass('hidden');
            $('#local-video-wrp video').addClass('hidden');
        }
        $('.mute-button[data-kind="video"]').css('opacity','0.5');
        $('#screen-share').attr('data-state','on');
        $('#screen-share').toggleClass('screen-share-active');

        //Send screen share signal
        signalingChannel.send(JSON.stringify({
            type: 'screen',
            on: true 
        }));

    }catch(e){    
        console.log('Error: Could not capture screen.',e.name);

        if(e.name=="NotAllowedError")
            alert('Sorry, the application does not have permission to access display media.')
        else
            alert('Sorry, some error occured :(');
    }
}

/**Stop the screen sharing, and restart camera if initially unmuted */
async function onStopScreenShare(){

    //If local video track does not exist, create one
    if(localVideoStream.getVideoTracks().length==0){
        const stream = await navigator.mediaDevices.getUserMedia({'video': deviceConstraints.video});
        localVideoStream.addTrack(stream.getVideoTracks()[0]); 
    }

    //Replace the screen track of each peer, with the camera video track
    for(const peer in peers ){
        if(!peers[peer])continue;
            if(!peers[peer].peerConn)continue;

            var sender = peers[peer].peerConn.getSenders().find(function(s) {
                if(!s.track)return false;
                return s.track.kind == 'video';
            });

            //If a sender with the kind video exists, replace its track with the camera video;
            //Else add the track creating a new sender, renegotiation is required in this case, so call again
            if(sender){
                sender.replaceTrack(localVideoStream.getVideoTracks()[0]);
            }else{
                peers[peer].peerConn.addTrack(localVideoStream.getVideoTracks()[0]);
                peers[peer].call();
            }
    };

    //stop the screen track
    screenStream.getTracks()[0].stop();

    //Update the UI
    if(!muted.video){
        $('#local-video-wrp .video-off').addClass('hidden');
        $('#local-video-wrp video').removeClass('hidden');
    }
    $('.mute-button[data-kind="video"]').css('opacity','1');
    $('#screen-share').attr('data-state','off');
    $('#screen-share').toggleClass('screen-share-active');

    //Send screen share signal
    signalingChannel.send(JSON.stringify({
        type: 'screen',
        on: false 
    }));
}