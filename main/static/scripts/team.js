;(function() {

    const roomName =  $('#room-name').val();
    const selfUsername = $('#username').val();
    const chatsWrapper =   document.getElementById('chats-wrapper');
    const members = []

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

    $('.member-name').each((i,ele)=>{
        members.push($(ele).attr('data-username'));
    })
    
    $('#team-info-btn').on('click', function(e){
        $('.team-info').parent().toggleClass('team-info-active');
    });

    $('.invite-btn').on('click', function(e){
        $('#overlay').removeClass('hidden');
    });

    $('.close-overlay').on('click', function(e){
        $('#overlay').addClass('hidden');
    });

    $('#user-search-input').on('keypress', function(e){
        if(e.keyCode == 13){
            search();
        }
    });

    $('#user-search-btn').on('click', function(e){
        search();
    })

    function search(){
        const query = $('#user-search-input').val();
        $('#search-res-wrp').html("");
        
        if(query.length<3){
            $('#search-res-msg').text('Please enter atleast 3 characters.');
            $('#search-res-msg').show();
            return;
        }
        $('#search-res-msg').text('Searching...');
        $.ajax({
            url: '/search/',
            data: {query: query},
            dataType: 'json',
            success: (data)=>{
                console.log('Search Results:',query,data);
                const results = removeMembers(data);
                
                if(results.length == 0){
                    $('#search-res-msg').text('No Results');
                    return;
                }

                $('#search-res-msg').hide();

                results.forEach((res)=>{
                    const temp = $('#search-res-tmp')[0];
                    const p = temp.content.cloneNode(true);
                    $('.res-name', p).text(res.name);
                    $('.res-logo', p).text(res.name[0].toUpperCase());
                    $('.res-invite', p).attr('data-username',res.username);
                    $('.res-invite',p).on('click',invite);
                    $('#search-res-wrp').append(p);
                })
            },
            error: (err)=>{
                $('#search-res-msg').text('Some Error Occured :(');
            }
        });
    }

    function removeMembers(a){
        const presentB = {};
        const res = []
        members.forEach((e)=>{presentB[e]=true});
        a.forEach((e)=>{
            if(!presentB[e.username])res.push(e);
        })
        return res;
    }

    //callback of invite button (.res-invite) click event
    function invite(){
        console.log('Inviting',$(this).text());        
        $(this).attr('src','/static/img/loading-ind.gif');
        $.ajax({
            type:'POST',
            url:'/invite/',
            data: {'csrfmiddlewaretoken':$('#csrf-token').val(),
                    'team_id':$('#team-id').val(),
                    'username':$(this).attr('data-username')},
            success: ()=>{
                $(this).off('click');
                $(this).attr('src','/static/img/tick.svg');
                members.push($(this).attr('data-username'));
            },
            error: (err)=>{
                $(this).attr('src','/static/img/add-member.svg');
                alert('Some error occured :(');
                console.log(err);
            }
        })
    }

    $('.team-leave-btn').on('click', function(e){
        const conf = confirm('Leave the team? :( ');
        if(!conf)return;
        $(this).attr('src','/static/img/loading-ind.gif');
        $.ajax({
            type:'POST',
            url:'/leave-team/',
            data: {'csrfmiddlewaretoken':$('#csrf-token').val(),
                    'team_id':$('#team-id').val()},
            success: ()=>{
                window.location='/';
            },
            error: (err)=>{
                alert('Some error occured :(');
                $(this).attr('src','/static/img/leave.svg');
                console.log(err);
            }
        })
    })

})()