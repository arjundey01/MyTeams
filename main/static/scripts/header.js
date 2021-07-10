$('#header-profile').on('click', function(e){
    $('#header-profile-options').toggleClass('hidden');
});

$('#notif-btn').on('click', function(e){
    $('#notifs').toggleClass('hidden');
    $.ajax({
        method: 'POST',
        url: '/seen-notif/',
        data: {'csrfmiddlewaretoken':$('#csrf-token').val()},
        success: (data)=>{
            $('#new-notif-ind').addClass('hidden');
        },
        error: (err)=>{
            console.log('Could not seen notifications.',err);
        }
    })
});

$('.accept-invite').on('click',function(e){
    $(this).attr('src','/static/img/loading-ind.gif');
    $.ajax({
        method: 'POST',
        url: '/accept-invite/',
        data: {'csrfmiddlewaretoken':$('#csrf-token').val(),
                'team_id':$(this).attr('data-team-id')},
        success: (data)=>{
            const name = $(this).attr('data-name');
            window.location = `/team/${name}/`;
        },
        error: (err)=>{
            $(this).attr('src','/static/img/tick.svg');
            console.log('Could not accept invite.',err);
            alert('Something went wrong :(');
        }
    })
});

$('.decline-invite').on('click',function(e){
    $(this).parent().css('opacity','0.5');
    $.ajax({
        method: 'POST',
        url: '/decline-invite/',
        data: {'csrfmiddlewaretoken':$('#csrf-token').val(),
                'team_id':$(this).attr('data-team-id')},
        success: (data)=>{
            $(this).parent().remove();
        },
        error: (err)=>{
            console.log('Could not decline invite.',err);
            $(this).parent().css('opacity','1');
            alert('Something went wrong :(');
        }
    })
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
    $('.search-res').remove();
    $('#search-res-msg').show();
    
    if(query.length<3){
        $('#search-res-msg').text('Please enter atleast 3 characters.');
        return;
    }
    $('#search-res-wrp').removeClass('hidden');
    $('#search-res-msg').text('Searching...');
    $.ajax({
        url: '/search/',
        data: {query: query},
        dataType: 'json',
        success: (results)=>{            
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
                $('.res-chat', p).attr('href',`/chat/u/${res.username}`);
                $('#search-res-wrp').append(p);
            })
        },
        error: (err)=>{
            $('#search-res-msg').text('Some Error Occured :(');
        }
    });
}

$(window).on('click', function(e){
    if(!$('#search-res-wrp')[0].contains(e.target)){
        $('#search-res-wrp').addClass('hidden');
    }
    if(!$('#notifs')[0].contains(e.target) && !$('#notif-btn')[0].contains(e.target)){
        $('#notifs').addClass('hidden');
    }
})