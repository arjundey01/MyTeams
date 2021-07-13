;(function() {
    /*** The room is the same one as the video chat room.
     * So it recieve all messages that video chat room participants get*/
    const roomName =  $('#room-name').val();

    const selfUsername = $('#username').val();
    const chatsWrapper =   document.getElementById('chats-wrapper');

    chatsWrapper.scrollTo(0,chatsWrapper.scrollHeight);

    /**The websocket signalling channel used to send and recieve messages*/
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
        alert('Could not connect to the chat server. It may be a security issue. Please close and reopen your browser window and then retry.');
    }

    function handleLogin({success}){
        if(success)
            console.log("Logged in successfully!");
        else
            console.log("Unauthorized. You cannot connect to this room.")
    }

    /**Handle incoming message.
     * Create and append to the message panel, a corresponding HTML element
     */
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

    /**Handle a video chat room join message.*/
    function handleJoin({name}){
        const temp = document.getElementById('info-msg-tmp');
        const p = temp.content.cloneNode(true);
        $('.msg-text',p).text(`${name} joined the video chat.`);
        $('.msg-time',p).text(getTimestamp());
        
        chatsWrapper.appendChild(p);
        chatsWrapper.scrollTo(0,chatsWrapper.scrollHeight);
    }

    /**Handle a video chat room leave message */
    function handleLeave({name}){
        const temp = document.getElementById('info-msg-tmp');
        const p = temp.content.cloneNode(true);

        $('.msg-text',p).text(`${name} left the video chat.`);
        $('.msg-time',p).text(getTimestamp());
        
        chatsWrapper.appendChild(p);
        chatsWrapper.scrollTo(0,chatsWrapper.scrollHeight);
    }

    /**Get formatted time stamp DD/MM/YYYY, HH:MM AM*/
    function getTimestamp(){
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-IN');
        const timeStr = now.toLocaleTimeString('en-US',{hour:'2-digit', minute:'2-digit'});
        return `${dateStr}, ${timeStr}`
    }

    //Send a message by pressing enter in the message input
    $('#chat-input').on('keypress', function(e){
        if(e.keyCode == 13){
            sendMessage();
        }
    });

    //Send a message by pressing the send button
    $('#chat-send-button').on('click', function(e){
        sendMessage();
    })

    //Send a 'message' message over the signalling channel
    function sendMessage(){
        if($('#chat-input').val().trim()!=""){
            signalingChannel.send(JSON.stringify({
                type:'message',
                text:$('#chat-input').val()
            }))
            $('#chat-input').val("");
        }
    }

    //Go back
    $('.back-button').on('click', function(e){
        window.location='/';
    })
})()