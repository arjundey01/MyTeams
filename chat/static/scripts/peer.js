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

Peer.prototype.initConn = function(){
    if(this.peerConn!=null){
        this.peerConn.close();
        delete this.peerConn;
    }

    this.peerConn = new RTCPeerConnection(RTCPeerConfig);

    this.localVideoStream.getTracks().forEach(track=>{
        this.peerConn.addTrack(track);
    })
    
    this.peerConn.ontrack= async ({track})=>{
        console.log("got torakku",track);
        this.remoteStream.addTrack(track);
        $(this.remoteVideo).parent().removeClass('hidden');
    }

    this.peerConn.onicecandidate = (e)=>{
        // console.log('ICECANDIDATE',e.candidate);
        if(e.candidate){
            this.signalingChannel.send(JSON.stringify({type:"candidate",candidate: e.candidate, target:this.username}));
        }
    }
}

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
        this.signalingChannel.send(JSON.stringify(
            {type:'offer', offer:offer, target:this.username}
        ));
        this.peerConn.setLocalDescription(offer);
    },function(e){
        console.log("Could not create offer: ",e);
    },
    {offerToReceiveAudio:true, offerToReceiveVideo:true})
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

Peer.prototype.getLocalMuteStatus = function(){
    muteStatus={video:true, audio:true};
    this.localVideoStream.getTracks().forEach(track=>{
        muteStatus[track.kind]=false;
    })
    return muteStatus;
}