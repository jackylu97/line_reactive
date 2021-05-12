// on load
$(function(){
    $( "body" ).append( "<div id='custom'></div>" );
    $("#custom").load("custom/custom.html"); 
  });

function choose_song(value) {
    CABLES.patch.setVariable("url", "assets/test"+ String(value) + ".mp3");
    document.getElementById("selector").classList.add("hide");
}

