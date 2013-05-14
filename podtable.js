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
        callback(null,jsyaml.load(req.responseText));
      } else {
        callback(new Error('Unexpected HTTP status ' + req.status));
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

function fractional(str) {
  var matches = /(-?\d+\.?\d*)\/(\d+\.?\d*)/.exec(str);
  if (matches) return parseFloat(matches[1]) / parseFloat(matches[2]);
  else return parseFloat(str);
}

var stage = document.getElementById("stage");
//Start paused
stage.setCurrentTime(0);
stage.pauseAnimations();

//Hook up SVG animation to audio playback
document.getElementById("podcast-audio").addEventListener("seeking",function(e){
  stage.setCurrentTime(e.target.currentTime);
  stage.pauseAnimations();
});
document.getElementById("podcast-audio").addEventListener("seeked",function(e){
  if(!e.target.paused) document.getElementById("stage").unpauseAnimations();
  stage.setCurrentTime(e.target.currentTime);
});
document.getElementById("podcast-audio").addEventListener("pause",function(e){
  stage.pauseAnimations();
});
document.getElementById("podcast-audio").addEventListener("playing",function(e){
  stage.unpauseAnimations();
});
   
/*global queue*/
   
//Parse setting + episode definition
queue()
  .defer(getYAML,'setting.yaml')
  .defer(getYAML,'episode.yaml')
  .await(function(err,setting,episode) {
    //todo: handle multiple sources
    document.getElementById("podcast-audio").src = asset(episode.audio);
    
    //Only supporting one scene for now
    var scene = episode.scenes[0];
    var set = setting.sets[scene.set];
    var stageW, stageH;
    var xOrigin, yOrigin;
    var angle, cos, sin;
    var resolution;
    
    if(set.backdrop){
      var backdrop = setting.backdrops[set.backdrop];
      
      stageW = backdrop.width || 1920;
      stageH = backdrop.height || 1080;
      xOrigin = (backdrop.origin && backdrop.origin[0]) || 0;
      yOrigin = (backdrop.origin && backdrop.origin[1]) || 0;
      
      angle = (Math.PI / 2) * fractional(backdrop.perspective);
      cos = Math.cos(angle); sin = Math.sin(angle);
      resolution = backdrop.resolution || 1;
      console.log(resolution)
      
      var bg = svgElem('image');
      bg.setAttributeNS('http://www.w3.org/1999/xlink','href',
        asset(backdrop.image));
      bg.setAttribute('width',stageW);
      bg.setAttribute('height',stageH);
      stage.appendChild(bg);
      
    } else {
      stageW = 1920; stageH = 1080;
    }
    
    for(var i = 0; i < set.props.length; i++) {
      var prop = set.props[i];
      var actor = setting.actors[prop.actor];
      var image = svgElem('image');
      
      image.setAttributeNS('http://www.w3.org/1999/xlink','href', asset(actor.src));
      
      image.setAttribute('width',actor.width);
      image.setAttribute('height',actor.height);
      image.setAttribute('x',xOrigin + resolution * (prop.position[0] - cos * prop.position[2]));
      image.setAttribute('y',stageH - (yOrigin + resolution * (prop.position[1] - sin * prop.position[2])));
      
      //Not currently being handled: reordering the elements by Z order

      stage.appendChild(image);
    }
  });
