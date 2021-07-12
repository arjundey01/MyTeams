//Open create team popup
$('.create-team').on('click', function(e){
    $('#overlay').removeClass('hidden');
    $('#create-team-form').removeClass('hidden');
});

//Close the overlay
$('.close-overlay').on('click', function(e){
    $('#overlay').addClass('hidden');
    $('#overlay>div').addClass('hidden');
});

//Add image to the create team form
$('#create-team-prev').on('click',function(e){
    $('#create-team-img').trigger('click');
})

//Preview the input image in the create teams form
$('#create-team-img').on('change',function(e){
    if(this.files[0].size>2*1024*1024){
        alert('Image size limit exceeded. Please use a smaller image (<=1MB).')
        this.value="";
        return;
    }
    let img = $('#create-team-prev img');
    $('#create-team-prev p').hide();
    img.removeClass(['h-16', 'w-16']);
    img.addClass(['h-full', 'w-full']);
    previewImage(this, img[0]);
})

/**
 * Preview an input image inside an image element
 * @param {HTMLInputElement} inputImg 
 * @param {HTMLImageElement} prevImg 
 */
function previewImage(inputImg, prevImg){
    var reader = new FileReader();
    reader.onload = function(e) {
        $(prevImg).attr('src', e.target.result);
    }
    reader.readAsDataURL(inputImg.files[0]);
}

//Redirect to team page
$('.team-thumbnail').on('click',function(e){
    const name = $(this).attr('data-name');
    window.location = `/team/${name}/`;
});

//Toggle conversations panel in mobile screens
$('#conv-toggle').on('click', function(e){
    $('#conv-panel').toggleClass('-left-full');
});