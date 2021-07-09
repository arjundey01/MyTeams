let vh = window.innerHeight;
document.documentElement.style.setProperty('--vh', `${vh}px`);

window.addEventListener('resize', () => {
    let vh = window.innerHeight;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
});

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