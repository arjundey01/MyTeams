let vh = window.innerHeight;
document.documentElement.style.setProperty('--vh', `${vh}px`);

window.addEventListener('resize', () => {
    let vh = window.innerHeight;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
});

$('#header-profile').on('click', function(e){
    $('#header-profile-options').toggleClass('hidden');
});