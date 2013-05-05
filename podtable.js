//polyfill XHR
window.XMLHttpRequest = window.XMLHttpRequest || function () {
    /*global ActiveXObject*/
    try { return new ActiveXObject("Msxml2.XMLHTTP.6.0"); } catch (e1) { }
    try { return new ActiveXObject("Msxml2.XMLHTTP.3.0"); } catch (e2) { }
    try { return new ActiveXObject("Msxml2.XMLHTTP"); } catch (e3) { }
    throw new Error("This browser does not support XMLHttpRequest.");
};

//write function for defining asset URLs
//note: function is for convenience, not sandboxing (no '..' rejection)
function asset(url){
  if(url.match(/^(?:https?\:)\/\//)) return url;
  else return 'assets/' + url;
}

//Get a YAML document via XHR
function getYAML(url,callback) {
  /*global jsyaml*/
  var req = XMLHttpRequest();
  req.open('GET',url,true);
  req.onreadystatechange = function () {
    if (req.readyState == 4)
      if(req.status == 200 || req.status == 304) {
        callback(jsyaml.load(req.responseText));
      } else {
        throw new Error('Unexpected HTTP status ' + req.status);
      }
  };
  req.send();
}

//Start paused
document.getElementById("podcast-animation").setCurrentTime(0);
document.getElementById("podcast-animation").pauseAnimations();

//Hook up SVG animation to audio playback
document.getElementById("podcast-audio").addEventListener("seeking",function(e){
  document.getElementById("podcast-animation").setCurrentTime(e.target.currentTime);
  document.getElementById("podcast-animation").pauseAnimations();
});
document.getElementById("podcast-audio").addEventListener("seeked",function(e){
  if(!e.target.paused) document.getElementById("podcast-animation").unpauseAnimations();
  document.getElementById("podcast-animation").setCurrentTime(e.target.currentTime);
});
document.getElementById("podcast-audio").addEventListener("pause",function(e){
  document.getElementById("podcast-animation").pauseAnimations();
});
document.getElementById("podcast-audio").addEventListener("playing",function(e){
  document.getElementById("podcast-animation").unpauseAnimations();
});
    
//Parse episode definition
getYAML('episode.yaml',function(episode){
  //todo: handle multiple sources
  document.getElementById("podcast-audio").src = asset(episode.audio);
  
});