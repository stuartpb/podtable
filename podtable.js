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

function svgElem(tag){
  return document.createElementNS(tag,"http://www.w3.org/2000/svg");
}

function svgTime(time){
  /*global ms*/
  if(typeof time == 'string'){
    return ms(ms(time));
  } else return ms(time);
}

//TODO: Make this constant from run to run
function randomBool(){
  return Math.random() > 0.5;
}
function randomVal(low,high){
  return Math.random() * (high-low) + low;
}

function randomStartEnd(edges){
  var coords = [[],[]];
  //Choose random axis and direction
  var crossAxis = +randomBool(); var otherAxis = +!crossAxis;
  var startEdge = +randomBool(); var endEdge = +!startEdge;
  
  //Set edges for the edge-to-edge axis
  coords[otherAxis][startEdge] = edges[otherAxis][startEdge];
  coords[otherAxis][endEdge] = edges[otherAxis][endEdge];
  
  //Set start and opposite end for the intermediate axis
  var startCoord = randomVal(coords[crossAxis][startEdge],
    coords[crossAxis][endEdge]);
  coords[crossAxis][startEdge] = startCoord;
  coords[crossAxis][endEdge] = coords[crossAxis][endEdge] - startCoord;
  return coords;
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
  
  var stage = document.getElementById("podcast-animation");
  var stageW, stageH;
  if(episode.background){
    stageW = episode.background.width;
    stageH = episode.background.height;
    var bg = svgElem('image');
    bg.href = asset(episode.background.image);
    bg.setAttribute('width',stageW);
    bg.setAttribute('height',stageH);
    stage.appendChild(bg);
  } else {
    stageW = 640; stageH = 480;
  }
  
  var baseSize = Math.min(stageW, stageH) / 3;
  
  var edges = [[-baseSize,stageW+baseSize],[-baseSize,stageH+baseSize]];
  
  for(var i = 0; i < episode.images; i++) {
    var epImage = episode.images[i];
    var image = svgElem('image');
    image.setAttribute('width',baseSize);
    image.setAttribute('height',baseSize);
    var anim = svgElem('animateMotion');
    anim.setAttribute('begin', svgTime(epImage.begin));
    anim.setAttribute('end', svgTime(epImage.end));
    var rseCoords = randomStartEnd(edges);
    anim.setAttribute('from', rseCoords[0].join());
    anim.setAttribute('to', rseCoords[1].join());
    image.appendChild(anim);
    stage.appendChild(image);
  }
});