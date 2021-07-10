$('.create-team').on('click', function(e){
    $('#overlay').removeClass('hidden');
    $('#create-team-form').removeClass('hidden');
});


$('.close-overlay').on('click', function(e){
    $('#overlay').addClass('hidden');
    $('#overlay>div').addClass('hidden');
});

$('#create-team-prev').on('click',function(e){
    $('#create-team-img').trigger('click');
})

$('#create-team-img').on('change',function(e){
    let img = $('#create-team-prev img');
    $('#create-team-prev p').hide();
    img.removeClass(['h-16', 'w-16']);
    img.addClass(['h-full', 'w-full']);
    previewImage(this, img[0]);
})

var previewImage= function(inputImg, prevImg){
    var reader = new FileReader();
    reader.onload = function(e) {
        $(prevImg).attr('src', e.target.result);
    }
    reader.readAsDataURL(inputImg.files[0]);
}

$('.team-thumbnail').on('click',function(e){
    const name = $(this).attr('data-name');
    window.location = `/team/${name}/`;
});

$('#conv-toggle').on('click', function(e){
    $('#conv-panel').toggleClass('-left-full');
});