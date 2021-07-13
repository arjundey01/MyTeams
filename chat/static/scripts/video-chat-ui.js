//Toggle the message panel
$('.chat-toggle').on('click', function(e){
    $('#chat-panel').toggleClass('chat-panel-active');
    if($('#chat-panel').hasClass('chat-panel-active')){
        $('#new-msg-indicator').addClass('hidden');
        $('#chat-msg-wrp')[0].scrollTo(0,$('#chat-msg-wrp')[0].scrollHeight);
    };
})

//For getting coorect viewpoert height in mobile browsers
let vh = window.innerHeight;
document.documentElement.style.setProperty('--vh', `${vh}px`);

window.addEventListener('resize', () => {
    let vh = window.innerHeight;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
});

//Copy the invite link to the clipboard
$('#invite-people').on('click', function(e){
    navigator.clipboard.writeText(window.location.href)
    .then(()=>{alert('Invite link copied!');})
    .catch(()=>{alert('Could not copy invite link :(')});
})

//Focus the video, when clicked
$('.video-ele').on('click', focusVideo);

/**Focus the video. 
 *Enters full screen in larger screens.
 *Sets the focused video element in mobile screens
 */
function focusVideo(e){
    e.preventDefault();
    if(window.innerWidth > 640){
        e.target.requestFullscreen();
        return;
    }
    if($('#focused-video>div').length){
        $('#video-wrapper')[0].appendChild($('#focused-video>div')[0]);
    }
    $('#focused-video').html("");
    $('#focused-video')[0].appendChild(this);
}

$('#focused-video').on('click', function(){
    this.requestFullscreen();
})

//Go back
$('.back-button').on('click',function(){
    window.history.back();
})

const videosContainer = $('#video-wrapper')[0];

/**Append the video element in the videos wrapper and update the layout */
function appendVideoElement(ele){
    $(videosContainer).append(ele);
    updateVideoContainerLayout();
}

/**Update the video container layout according to the number of videos*/
function updateVideoContainerLayout(){
    let cnt = 0;
    $('.ele',videosContainer).each(function(i,e){
        if(e.style.display!='none')cnt++;
    })
    if(cnt<=1){
        $(videosContainer).css('grid-template-columns','repeat(1, minmax(0, 1fr))');
        $(videosContainer).css('grid-template-rows','repeat(1, minmax(0, 1fr))');
    }
    else if(cnt<=2){
        $(videosContainer).css('grid-template-columns','repeat(2, minmax(0, 1fr))');
        $(videosContainer).css('grid-template-rows','repeat(1, minmax(0, 1fr))');
    }
    else if (cnt<=4){
        $(videosContainer).css('grid-template-columns','repeat(2, minmax(0, 1fr))');
        $(videosContainer).css('grid-template-rows','repeat(2, minmax(0, 1fr))');
    }
    else if (cnt<=6){
        $(videosContainer).css('grid-template-columns','repeat(3, minmax(0, 1fr))');
        $(videosContainer).css('grid-template-rows','repeat(2, minmax(0, 1fr))');
    }
    else if (cnt<=9){
        $(videosContainer).css('grid-template-columns','repeat(3, minmax(0, 1fr))');
        $(videosContainer).css('grid-template-rows','repeat(3, minmax(0, 1fr))');
    }else{
        $(videosContainer).css('grid-template-rows','unset');
        $('.ele').css('min-height', '220px')
    }
}
