;(function(){
    const members = []
    
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
        
        $('#search-res-msg').show();
        if(query.length<3){
            $('#search-res-msg').text('Please enter atleast 3 characters.');
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
                    $('.res-username', p).text(res.username);
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