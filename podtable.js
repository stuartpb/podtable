// Simple polyfills ///////////////////
//// XHR
window.XMLHttpRequest = window.XMLHttpRequest || function () {
    /*global ActiveXObject*/
    try { return new ActiveXObject("Msxml2.XMLHTTP.6.0"); } catch (e1) { }
    try { return new ActiveXObject("Msxml2.XMLHTTP.3.0"); } catch (e2) { }
    try { return new ActiveXObject("Msxml2.XMLHTTP"); } catch (e3) { }
    throw new Error("This browser does not support XMLHttpRequest.");
};

//// Object.keys
if (!Object.keys) Object.keys = function(o) {
  if (o !== Object(o))
    throw new TypeError('Object.keys called on a non-object');
  var k=[],p;
  for (p in o) if (Object.prototype.hasOwnProperty.call(o,p)) k.push(p);
  return k;
};

// Functions //////////////////////////

//write function for defining asset URLs
//note: function is for convenience, not sandboxing (no '..' rejection)
function asset(url){
  if(url.match(/^(?:https?\:)\/\//)) return url;
  else return 'assets/' + url;
}

//Get a YAML document via XHR
function getYAML(url,callback) {
  /*global jsyaml*/
  var req = new XMLHttpRequest();
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
  return document.createElementNS("http://www.w3.org/2000/svg",tag);
}

var parseTime; (function(){
  var timeScale = [
    {names: ['s', 'seconds','second'], factor: 1},
    {names: ['min', 'minutes', 'minute', 'm'], factor: 60},
    {names: ['h','hours','hour'], factor: 60},
    {names: ['d','days','day'], factor: 24},
    {names: ['y', 'years', 'year'], factor: 365.25}];
    
  var metrics = {ms: 1/1000};
  
  for (var i = 0; i < timeScale.length; i++) {
    var time = 1;
    for (var j = 0; j <= i; j++){
      time *= timeScale[j].factor;
    }
    metrics[i+1] = time;
    for (j = 0; j < timeScale[i].names.length; j++) {
      metrics[timeScale[i].names[j]] = time;
    }
  }
  
  var pattern = '(\\d*\\.?\\d+)\\s*(' + Object.keys(metrics).join('|') + ')';
    
  parseTime = function (str) {
    var milliseconds = 0;
    var segments ;
    if(typeof str == 'string') str.split(':');
    if(segments && segments.length > 1) {
      for (var i = 0; i < segments.length; i++)
        milliseconds += parseFloat(segments[i]) * metrics[segments.length-i];
    } else {
      var regex = new RegExp(pattern,'ig');
      
      var match = regex.exec(str);
      if(match){
        while(match) {
          milliseconds += parseFloat(match[1]) * metrics[match[2].toLowerCase()];
          match = regex.exec(str);
        }
      } else {
        milliseconds = parseFloat(str);
      }
    }
    return milliseconds;
  };
})();



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
  
  console.log(crossAxis);
  console.log(startEdge);
  //Set edges for the edge-to-edge axis
  coords[0][otherAxis] = edges[otherAxis][startEdge];
  coords[1][otherAxis] = edges[otherAxis][endEdge];
  
  //Set start and opposite end for the intermediate axis
  var startCoord = randomVal(edges[crossAxis][startEdge],
    edges[crossAxis][endEdge]);
  coords[0][crossAxis] = startCoord;
  coords[1][crossAxis] = edges[crossAxis][endEdge] - startCoord;
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
    bg.setAttributeNS('http://www.w3.org/1999/xlink','href',
      asset(episode.background.image));
    bg.setAttribute('width',stageW);
    bg.setAttribute('height',stageH);
    stage.appendChild(bg);
  } else {
    stageW = 640; stageH = 480;
  }
  
  var baseSize = Math.min(stageW, stageH) / 3;
  
  var edges = [[0,stageW+baseSize*2],[0,stageH+baseSize*2]];
  for(var i = 0; i < episode.images.length; i++) {
    var epImage = episode.images[i];
    var image = svgElem('image');
    image.setAttribute('width',baseSize);
    image.setAttribute('height',baseSize);
    image.setAttribute('x',-baseSize);
    image.setAttribute('y',-baseSize);
    image.setAttributeNS('http://www.w3.org/1999/xlink','href',
      asset(epImage.src));
    var anim = svgElem('animateMotion');
    anim.setAttribute('begin', parseTime(epImage.begin));
    anim.setAttribute('dur', parseTime(epImage.end) - parseTime(epImage.begin));
    var rseCoords = randomStartEnd(edges);
    anim.setAttribute('from', rseCoords[0].join());
    anim.setAttribute('to', rseCoords[1].join());
    image.appendChild(anim);
    stage.appendChild(image);
  }
});