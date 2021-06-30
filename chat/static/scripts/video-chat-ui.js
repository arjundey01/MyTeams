let vh = window.innerHeight;
document.documentElement.style.setProperty('--vh', `${vh}px`);

window.addEventListener('resize', () => {
    let vh = window.innerHeight;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
});

$('.chat-toggle').on('click', function(e){
    $('#chat-panel').toggleClass('chat-panel-active');
})

const videosContainer = $('#video-wrapper')[0];

function appendVideoElement(ele){
    $(videosContainer).append(ele);
    updateVideoContainerLayout();
}

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

$('#video-wrapper').on('')