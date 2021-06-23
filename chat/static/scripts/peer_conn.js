let otherUser;
const selfUser = 'self';
const localVideo = document.getElementById('local-video');
const remoteVideo = document.getElementById('remote-video');
const callButton = document.getElementById('call-button');
const roomName = 'test';
let selfConn;

const signalingChannel = new WebSocket(
    'wss://'
    + window.location.host.split(":")[0]
    +":8001"
    + '/ws/chat/'
    + roomName
    + '/'
);

signalingChannel.onopen = ()=>{
    signalingChannel.send(JSON.stringify({type:'login'}));
    console.log("Connected to signalling server!");
}

signalingChannel.onmessage = (msg)=>{
    console.log("Message:",msg.data);
    const data = JSON.parse(msg.data);
    switch(data.type){
        case 'login':
            handleLogin(data.payload);
            break;
        case 'offer':
            handleOffer(data.payload);
            break;
        case 'answer':
            handleAnswer(data.payload);
            break;
        case 'candidate':
            handleCandidate(data.payload);
            break;
        case 'leave':
            handleLeave(data.payload);
            break;
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


function handleLogin({success, channel}){
    console.log(channel);
    if(success){
        navigator.mediaDevices.getUserMedia({video: true, audio: true}).then((stream)=>{
            localVideo.srcObject = stream;
            const RTCPeerConfig = {"iceServers":[{"url":"stun:stun2.1.google.com:19302"}]};
            selfConn = new RTCPeerConnection(RTCPeerConfig);
            selfConn.addStream(stream);
            selfConn.onaddstream = function(e){
                remoteVideo.srcObject = e.stream;
            }
            selfConn.onicecandidate = function(e){
                console.log('ICECANDIDATE',e);
                if(e.candidate){
                    signalingChannel.send(JSON.stringify({type:"candidate",candidate: e.candidate}));
                }
            }
        }).catch((e)=>{
            console.log(e);
        });
    }
}

function handleOffer({offer}){
    selfConn.setRemoteDescription(new RTCSessionDescription(offer));
    selfConn.createAnswer(function(answer){
        selfConn.setLocalDescription(answer);
        signalingChannel.send(JSON.stringify(
            {type:'answer', answer:answer}
        ));
    }, function(e){
        console.log("Could not create answer: ", e);
    });
}

function handleAnswer({answer}){
    selfConn.setRemoteDescription(new RTCSessionDescription(answer));
}

function handleCandidate({candidate}){
    selfConn.addIceCandidate(new RTCIceCandidate(candidate));
}

function handleMessage(msg){
    console.log(msg);
}

function call(){
    selfConn.createOffer(function(offer){
        signalingChannel.send(JSON.stringify(
            {type:'offer', offer:offer}
        ));
        selfConn.setLocalDescription(offer);
    },function(e){
        console.log("Could not create offer: ",e);
    })
}

callButton.addEventListener('click',function(e){call();});