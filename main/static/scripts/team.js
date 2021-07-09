;(function() {

    const roomName =  $('#room-name').val();
    const selfUsername = $('#username').val();
    const chatsWrapper =   document.getElementById('chats-wrapper');

    chatsWrapper.scrollTo(0,chatsWrapper.scrollHeight);

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
        signalingChannel.send(JSON.stringify({type:'login'}));
    }

    signalingChannel.onmessage = (msg)=>{
        const data = JSON.parse(msg.data);
        switch(data.type){
            case 'login':
                handleLogin(data.payload);
                break;
            case 'message':
                handleMessage(data.payload);
                break;
            case 'join':
                handleJoin(data.payload);
                break;
            case 'leave':
                handleLeave(data.payload);
                break;
            default:
                console.log("Message: ",data);
        }
    }

    signalingChannel.onerror = (err)=>{
        console.log("Signaling Channel Error: ",err);
        alert('Could not connect to the chat server. Please reload the page to retry.');
    }

    function handleLogin({success}){
        if(success)
            console.log("Logged in successfully!");
        else
            console.log("Unauthorized. You cannot connect to this room.")
    }

    function handleMessage({username, text, name}){
        let temp, p;
        if(selfUsername == username){
            temp = document.getElementById('self-msg-tmp');
            p = temp.content.cloneNode(true);
        }else{
            temp = document.getElementById('other-msg-tmp');
            p = temp.content.cloneNode(true);
            $('.msg-author',p).text(name);
            $('.msg-logo',p).text(name[0].toUpperCase());
        }

        $('.msg-text',p).text(text);
        $('.msg-time',p).text(getTimestamp());
        
        chatsWrapper.appendChild(p);
        chatsWrapper.scrollTo(0,chatsWrapper.scrollHeight);
     
    }

    function handleJoin({name}){
        const temp = document.getElementById('info-msg-tmp');
        const p = temp.content.cloneNode(true);
        $('.msg-text',p).text(`${name} joined the video chat.`);
        $('.msg-time',p).text(getTimestamp());
        
        chatsWrapper.appendChild(p);
        chatsWrapper.scrollTo(0,chatsWrapper.scrollHeight);
    }

    function handleLeave({name}){
        const temp = document.getElementById('info-msg-tmp');
        const p = temp.content.cloneNode(true);

        $('.msg-text',p).text(`${name} left the video chat.`);
        $('.msg-time',p).text(getTimestamp());
        
        chatsWrapper.appendChild(p);
        chatsWrapper.scrollTo(0,chatsWrapper.scrollHeight);
    }

    function getTimestamp(){
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-IN');
        const timeStr = now.toLocaleTimeString('en-US',{hour:'2-digit', minute:'2-digit'});
        return `${dateStr}, ${timeStr}`
    }

    $('#chat-input').on('keypress', function(e){
        if(e.keyCode == 13){
            sendMessage();
        }
    });

    $('#chat-send-button').on('click', function(e){
        sendMessage();
    })


    function sendMessage(){
        if($('#chat-input').val()!=""){
            signalingChannel.send(JSON.stringify({
                type:'message',
                text:$('#chat-input').val()
            }))
            $('#chat-input').val("");
        }
    }
    
    $('#team-info-btn').on('click', function(e){
        $('.team-info').parent().toggleClass('team-info-active');
    });

})()