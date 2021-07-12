/**
 * A class representing a peer connection wrapping the generic RTCPeerConnection
 * @param {string} peer_username Username of the peer, used as id in the signalling channel
 * @param {string} peer_name Display name of the peer
 * @param {MediaStream} localVideoStream A MediaStream referencing the local video
 * @param {WebSocket} signalingChannel A Websocket connection object used as the signalling channel
 * @param {boolean} was_requested If the peer was requested to be created by some other peer using 'add-peer'
 * @param {{audio:boolean, video:boolean}} muted_status If the remote video/audio is muted
 * @returns {Peer} an instance of the Peer class
 */
function Peer(peer_username, peer_name, localVideoStream, signalingChannel,
            was_requested=false, muted_status={audio:false, video:false}){

    this.username = peer_username;
    this.name = peer_name
    this.remoteVideo = null;
    this.peerConn = null;
    this.muted = muted_status;
    this.localVideoStream = localVideoStream
    this.signalingChannel = signalingChannel

    this.createVideo();
    
    this.initConn();
    
    if(was_requested){
        this.signalingChannel.send(JSON.stringify({type:"ready", target:this.username, muted:this.getLocalMuteStatus()}));
    }
    else
        this.signalingChannel.send(JSON.stringify({type:"add-peer", target:this.username, muted:this.getLocalMuteStatus()}));
}


/**
 * Create the HTML element and the MediaStream object representing the remote video.
 */
Peer.prototype.createVideo = function(){
    let temp = document.getElementById("remote-video-temp");
    let remoteVideoEle = temp.content.cloneNode(true);
    $("video", remoteVideoEle).attr('id',`remote-video-${this.username}`);
    $(".video-name", remoteVideoEle).text(this.name);
    $(".video-logo", remoteVideoEle).text(this.name[0].toUpperCase());
    appendVideoElement(remoteVideoEle);
    $(`#remote-video-${this.username}`).parent().on('click', focusVideo);

    this.remoteVideo = document.getElementById(`remote-video-${this.username}`);
    this.remoteStream = new MediaStream();
    this.remoteVideo.srcObject = this.remoteStream;

    this.handleMute({kind:'audio',muted: this.muted.audio});
    this.handleMute({kind:'video',muted: this.muted.video});
}


/**
 * Intialize the RTCPeerConnection object of the peer adding available local tracks and event listeners
 */
Peer.prototype.initConn = function(){
    if(this.peerConn!=null){
        this.peerConn.close();
        delete this.peerConn;
    }

    this.peerConn = new RTCPeerConnection(RTCPeerConfig);

    this.localVideoStream.getTracks().forEach(track=>{
        this.peerConn.addTrack(track);
    })
    
    //Called when a track is added by the remote peer
    this.peerConn.ontrack= async ({track})=>{
        console.log("got torakku",track);
        this.remoteStream.addTrack(track);
        $(this.remoteVideo).parent().removeClass('hidden');
    }

    //Called when an ICE candidate has been identified and added to the local peer
    this.peerConn.onicecandidate = (e)=>{
        // console.log('ICECANDIDATE',e.candidate);
        if(e.candidate){
            this.signalingChannel.send(JSON.stringify({type:"candidate",candidate: e.candidate, target:this.username}));
        }
    }
}

/**
 * Handle SDP offer recieved from the peer through the signalling channel
 * @param {{offer:RTCSessionDescriptionInit, username:string}} description Object containing the offer and the sender's username
 */
Peer.prototype.handleOffer = function({offer, username}){
    this.peerConn.setRemoteDescription(new RTCSessionDescription(offer));
    this.peerConn.createAnswer((answer)=>{
        this.peerConn.setLocalDescription(answer);
        this.signalingChannel.send(JSON.stringify(
            {type:'answer', answer:answer, target:username}
        ));
    }, function(e){
        console.log("Could not create answer: ", e);
    });
}

/**
 * Handle SDP answer recieved from the peer through the signalling channel
 * @param {{answer:RTCSessionDescriptionInit}} description Object containing the answer object 
 */
Peer.prototype.handleAnswer = function({answer}){
    this.peerConn.setRemoteDescription(new RTCSessionDescription(answer));
}

/**
 * Handle 'ready' signal sent in response to the 'add-peer' signal
 * @param {{muted:{audio:boolean, video:boolean}}} description Object containing the remote video/audio muted status
 */
Peer.prototype.handleReady = function({muted}){
    this.handleMute({kind:'audio',muted: muted.audio});
    this.handleMute({kind:'video',muted: muted.video});
    this.call();
}

/**
 * Handle an ICE Candidate sent by the peer
 * @param {{candidate:RTCIceCandidateInit}} description Object containing the ICE Candidate
 */
Peer.prototype.handleCandidate = async function({candidate}){
    if(candidate)
        await this.peerConn.addIceCandidate(new RTCIceCandidate(candidate));
}

/**
 * Handle 'mute' signal sent by the peer, when the remote video is muted/unmuted
 * @param {{kind: 'audio'|'video', muted:boolean}} description Object containing the kind and muted status of the remote video 
 */
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

/**
 * Call the remote peer by creating and sending an offer, and setting the local SDP description
 */
Peer.prototype.call = function(){
    this.peerConn.createOffer((offer)=>{
        this.signalingChannel.send(JSON.stringify(
            {type:'offer', offer:offer, target:this.username}
        ));
        this.peerConn.setLocalDescription(offer);
    },function(e){
        console.log("Could not create offer: ",e);
    },
    {offerToReceiveAudio:true, offerToReceiveVideo:true})
}

/**
 * Handle the leave(disconnection/hangup) of the peer
 */
Peer.prototype.handleLeave = function(){
    this.peerConn.close();
    delete this.peerConn;
    delete this.remoteStream;
    $(this.remoteVideo).parent().remove();
    updateVideoContainerLayout();
}

/**
 * Get the muted status of the local video
 * @returns {{video:boolean, audio:boolean}} The muted status of the local video
 */
Peer.prototype.getLocalMuteStatus = function(){
    muteStatus={video:true, audio:true};
    this.localVideoStream.getTracks().forEach(track=>{
        muteStatus[track.kind]=false;
    })
    return muteStatus;
}