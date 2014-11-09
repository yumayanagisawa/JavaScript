/*
    My Project: Audio Visualizer
*/

// Immediately-invoked function expression
;(function(){
  //global variables
  //var renderer;
  var coordinatesDataObj = {};
  var polynomial = 0;
  var init = true;
  var lastLat, lastLon;
  var sphere;
  var rotationCounterX=0;
  var rotationCounterY=0;

  // declare Audio Context
  var audioCtx = new window.AudioContext();
  var buf;
  var fft;
  var isSongFinished = false;
  //data
  var data = new Uint8Array(256);
  var isStreamingAudio = false;

  var renderer;
  var camera;
  var scene;
  $(function(){
    //instantiate SonicPlayerView, SonicPlayerModel, SonicPlayerController
    var sonicPlayerView = new SonicPlayerView();
    var sonicPlayerModel = new SonicPlayerModel();
    var sonicPlayerController= new SonicPlayerController( sonicPlayerView , sonicPlayerModel);
    // call init
    sonicPlayerController.init();
  });
  /////////////////////////////////////////////////////////////////////////
  /////  controller  //////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////////////
  function SonicPlayerController ( aSonicPlayerView, aSonicPlayerModel ) {
    this.view = aSonicPlayerView;
    this.model = aSonicPlayerModel;
  }
  SonicPlayerController.prototype = {
    // define init();
    init: function() {
      var scope = this;
      scope.view.initThreeDimentionalScene();
      scope.view.render();
      scope.view.setAudioVizCanvas();
      // initialize SoundCloud API access
      SC.initialize({client_id: scope.model.CLIENT_ID});
      // add eventListener
      var bjork = 128843605;
      var src = 'http://api.soundcloud.com/tracks/' + bjork + '/stream?client_id=' + scope.model.CLIENT_ID;
      var promise = scope.model.getComments(bjork);
      promise
      .then(scope.model.getLocation)
      //.then(scope.model.ajax)
      .then(function(){
        console.log(scope.model.users);
        scope.view.animateComments(scope.model.users);
        scope.view.setAudio(src);
        scope.setDrawingInterval();
        isStreamingAudio = true;
        //add event listener
        $('#juke-box').find('audio').on('ended', function(){
          isSongFinished = true;
        });
      });
    },
    setDrawingInterval: function(){
      var scope = this;
      var bezierInterval = setInterval(function(){
        if (isSongFinished === true) {
          clearInterval(bezierInterval);
          console.log('song finished and remove lines..');
          scope.view.isRendering = false;
          setTimeout(scope.view.removeLines, 2000);
        }
        if (init === true) {
          var latA = Math.random()*360;
          var lonA = Math.random()*360;
          var latB = Math.random()*360;
          var lonB = Math.random()*360;
          lastLat = latB;
          lastLon = lonB;
          init = false;
        } else {
          var latA = lastLat;
          var lonA = lastLon;
          var latB = Math.random()*360;
          var lonB = Math.random()*360;
          lastLat = latB;
          lastLon = lonB;
        }
        //var counter = 1;

        //sphere.rotation.x = (180-lastLat)* Math.PI/180;
        //sphere.rotation.y = (lastLon+90) * Math.PI/180;
        rotationCounterX = 0;
        scope.model.calcSpatialCoordinates(latA, lonA, latB, lonB);
        scope.view.isRendering = true;
        scope.view.isIncrementingX = true;
        scope.view.isIncrementingY = true;
      }, 2000);
    }
  };

  /////////////////////////////////////////////////////////////////////////
  /////  view  ////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////////////
  function SonicPlayerView() {
    this.isRendering = false;
    this.isIncrementingX = false;
    this.isIncrementingY = false;
  }
  SonicPlayerView.prototype = {
    initThreeDimentionalScene: function(){
      // create a 3D scene
      scene = new THREE.Scene();

      // create a camera
      camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 10, 1000);

      // create a render
      renderer = new THREE.WebGLRenderer();
      renderer.setClearColor(0x000028, 1.0);
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.shadowMapEnabled = true;

      //sphere
      var sphereGeometry = new THREE.SphereGeometry(20, 20, 20);
      var material = new THREE.MeshLambertMaterial({color: 0x3F5C74, transparent: true});
      material.opacity = 0.6;
      sphere = new THREE.Mesh(sphereGeometry, material);
      scene.add(sphere);
      
      //camera position
      camera.position.x = 0;
      camera.position.y = 0;
      camera.position.z = 100;
      camera.lookAt(scene.position);

      // add spotlight for the shadows
      var spotLight = new THREE.SpotLight(0xffffff);
      //spotLight.position.set(20, 20, 20);
      spotLight.position.set(500, 500, 1000);
      spotLight.shadowCameraNear = 20;
      spotLight.shadowCameraFar = 1000;
      spotLight.castShadow = true;

      scene.add(spotLight);

      // add the output of the renderer to the html element
      $('body').append(renderer.domElement);
    },
    render: function() {
      //if isRenderingTrue, render a bezier curve
      if (this.isRendering === true) {
        this.animateBezierCurve();
      }
      if (this.isIncrementingX === true) {this.rotateXaxisSphere();}
      if (this.isIncrementingY === true) {this.rotateYaxisSphere();}
      //this.rotateYaxisSphere();
      //this.rotateXaxisSphere();
      //rotation speed
        var rotSpeed = 0.1;
      if (isStreamingAudio === true) {
        data = this.getFft(fft);
        this.animateAudioViz(data);
      }  
      //resquestAnimationFrame
      requestAnimationFrame(this.render.bind(this));
      renderer.render(scene, camera);
    },
    getFft: function(aFft){
      var data = new Uint8Array(256);
      fft.getByteFrequencyData(data);
      //sconsole.log(data);
      return data;
    },
    animateAudioViz: function(aData) {
      //console.log(aData[0]);
      var audioVizCanvas = $('#audio-viz-canvas')[0];
      var centerWidth = audioVizCanvas.width/2;
      var centerHeight = audioVizCanvas.height/2;
      var ctx = audioVizCanvas.getContext("2d");
      ctx.clearRect(0, 0, centerWidth*2, centerHeight*2);
      var styles = ['#FF057A', '#2AE527', '#11B9FF', '#FFF400', '#F9FFC8'];
      var radiusA = aData[0];
      var radiusB = aData[10];
      var radiusC = aData[20];
      var radiusD = aData[30];
      var dataFigures = 5;
      for (var i = 0; i < dataFigures; i++) {
        ctx.beginPath();
        ctx.arc(centerWidth, centerHeight, aData[i*10+10]*1.5, 0, 2*Math.PI);
        ctx.strokeStyle = styles[i];
        ctx.stroke();
        ctx.closePath();
      }
    },
    rotateXaxisSphere: function(){
        if (rotationCounterX >= lastLat) {
          rotationCounterX = lastLat;
          this.isIncrementingX = false;
          //return false;
        } else {
          rotationCounterX++;
          sphere.rotation.x = (180-rotationCounterX) * (Math.PI/180);
        }
    },
    rotateYaxisSphere: function(){
        if (rotationCounterY >= lastLon) {
          rotationCounterY = lastLon;
          this.isIncrementingY = false;
        } else {
          rotationCounterY++;
          sphere.rotation.y = (rotationCounterY+90) * Math.PI/180;
        }
    },
    startBezierAnimation: function(){

    },
    addBezierCurve: function(){
      //draw bezier
      var SUBDIVISIONS = 20;
      var geometry = new THREE.Geometry();
      var quadraticCurve = new THREE.QuadraticBezierCurve3();
      quadraticCurve.v0 = new THREE.Vector3(coordinatesDataObj.v0x, coordinatesDataObj.v0y, coordinatesDataObj.v0z);
      quadraticCurve.v1 = new THREE.Vector3(coordinatesDataObj.v1x, coordinatesDataObj.v1y, coordinatesDataObj.v1z);
      quadraticCurve.v2 = new THREE.Vector3(coordinatesDataObj.v2x, coordinatesDataObj.v2y, coordinatesDataObj.v2z);
      for (var i = 0; i <= SUBDIVISIONS; i++) {
        geometry.vertices.push(quadraticCurve.getPoint(i / SUBDIVISIONS));
      }
      var material = new THREE.LineBasicMaterial( { color: 0xEE4950, linewidth: 5} );
      var line = new THREE.Line(geometry, material);
      sphere.add(line);
    },
    animateBezierCurve: function(){
      if (polynomial > 40) {
        polynomial = 0;
        this.isRendering = false;
        return false;
      }
      var SUBDIVISIONS = 20;
      var geometry = new THREE.Geometry();
      var curve = new THREE.QuadraticBezierCurve3();
      curve.v0 = new THREE.Vector3(coordinatesDataObj.v0x, coordinatesDataObj.v0y, coordinatesDataObj.v0z);
      curve.v1 = new THREE.Vector3(coordinatesDataObj.v1x, coordinatesDataObj.v1y, coordinatesDataObj.v1z);
      curve.v2 = new THREE.Vector3(coordinatesDataObj.v2x, coordinatesDataObj.v2y, coordinatesDataObj.v2z);
      for (var i = 0; i <= SUBDIVISIONS; i++) {
        geometry.vertices.push(curve.getPoint(i / ((40 - polynomial) + SUBDIVISIONS) ));
      }
      var r = Math.round(Math.random()*255);
      var g = Math.round(Math.random()*255);
      var b = Math.round(Math.random()*255);
      var material = new THREE.LineBasicMaterial( { color: 'rgb('+r+','+g+','+b+')', linewidth: 1} );
      var line = new THREE.Line(geometry, material);
      sphere.add(line);
      polynomial++;
    },
    animateParticle: function(){

    },
    removeLines: function(){
      /*
      need to go back to front
      http://stackoverflow.com/questions/11678497/cant-remove-objects-using-three-js
      */
      var obj, i;
      for (i = sphere.children.length-1; 0 <= i; i--) {
        obj = sphere.children[i];
        sphere.remove(obj);
      }
    },
    setAudio: function(src){
      console.log('gonna set audio');
      var audioElm  = new Audio();
      audioElm.controls = false;
      audioElm.src = src;
      var mediaSrc = audioCtx.createMediaElementSource(audioElm);
      mediaSrc.connect(audioCtx.destination);
      mediaSrc.buffer = buf;
      $('#juke-box').append(audioElm);
      audioElm.play();
      fft = audioCtx.createAnalyser();
      fft.fftSize = 256;
      mediaSrc.connect(fft);
      fft.connect(audioCtx.destination);
      //audioElm.appendTo($('body'));
    },
    animateComments: function(users){
      var counter = 0;
      var INTERVAL_TIME = 1000;
      var commentNumber = users.length;
      var commentInterval = setInterval(function(){
        $('#comment-box').html(users[counter].comment);
        counter++;
        if (counter === commentNumber) {
          counter = 0;
        }
        if (isSongFinished === true) {
        clearInterval(commentInterval);
        $('#comment-box').empty();
        }
      }, INTERVAL_TIME);
    },
    setAudioVizCanvas: function(){
      var audioVizCanvas = $('#audio-viz-canvas')[0];
      audioVizCanvas.width = window.innerWidth;
      audioVizCanvas.height = window.innerHeight;
      var centerWidth = audioVizCanvas.width/2;
      var centerHeight = audioVizCanvas.height/2;
      var ctx = audioVizCanvas.getContext("2d");
      ctx.beginPath();
      ctx.arc(centerWidth, centerHeight, centerHeight/2, 0, 2*Math.PI);
      ctx.strokeStyle = "#36EEC9";
      ctx.stroke();
    }
  };

  /////////////////////////////////////////////////////////////////////////
  /////  model  ///////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////////////
  function SonicPlayerModel(){
    this.CLIENT_ID = "8f474de4d1dedd5a6a4f4cbb60f4e6b8";
    this.spaceCoordinatesDataBox = {
      v0x : 0,
      v0y : 0,
      v0z : 0,
      v1x : 0,
      v1y : 0,
      v1z : 0,
      v2x : 0,
      v2y : 0,
      v2z : 0
    };
    this.trackObjs = [];
    this.users = [];
  }
  SonicPlayerModel.prototype = {
    // model functions about DOM
    getTrack: function(aGenre){
      console.log(aGenre);
      var scope = this;
      // empty trackObjs array
      scope.trackObjs.length = 0;
      var deferred = $.Deferred();
      SC.get('/tracks', {q: 'simian mobile disco remix'}, function(tracks){
        var length = tracks.length;
        for (var i = 0; i < length; i++) {
          var trackId = tracks[i].id;
          var imgUrl = tracks[i].artwork_url;
          var trackObj = new scope.trackObj(trackId, imgUrl);
          scope.trackObjs.push(trackObj);
        }
        return deferred.resolve(scope.trackObjs);
      });
      return deferred.promise();
    },
    trackObj: function(trackId, imgUrl){
      this.trackId = trackId;
      this.url = imgUrl;
    },
    getComments: function(trackId){
      var scope = this;
      var deferred = $.Deferred();
      var bjork = 128843605;
      SC.get('/tracks/' + bjork + '/comments', function(comments){
        console.log(comments);
        var length = comments.length;
        for (var i = 0; i < length; i++) {
          var commentObj = comments[i];
          var user = new scope.person(commentObj.body, commentObj.user_id, commentObj.timestamp);
          scope.users.push(user);
        }
        return deferred.resolve(scope.users, scope);
      });
      return deferred.promise();
    },
    person: function(comment, id, timestamp){
      this.comment = comment;
      this.id = id;
      this.timestamp = timestamp;
    },
    getLocation: function(users, scope){
      /*
      need a promise for each iteration
      http://stackoverflow.com/questions/20688803/jquery-deferred-in-each-loop
      */
      var promises = [];
      $.each(users, function(index, value){
        var deferred = $.Deferred();
        SC.get('/users/'+value.id, function(user){
          var city = user.city;
          users[index].city = city;
          //console.log(users[index]);
          return deferred.resolve(users);
        });
        promises.push(deferred);
      });
      return $.when.apply(undefined, promises).promise();
    },
    ajax: function (users){
      console.log(users);
      var promises = [];
      $.each(users, function(index, value){
        var deferred = $.Deferred();
        if (users[index].city !== null) {
          //var deferred = $.Deferred();
          $.ajax({
            url: "http://maps.googleapis.com/maps/api/geocode/json?address=" + users[index].city + "&sensor=false"
          })
          .done(function(res, status){
            console.log(res);
            if (res.results.length !== 0) {
              users[index].latitude = res.results[0].geometry.location.lat;
              users[index].longitude = res.results[0].geometry.location.lng;
            }
          return deferred.resolve();
          });
        }
      promises.push(deferred);
      });
      return $.when.apply(undefined, promises).promise();
    },
    // model functions about 3D rendering
    calcSpatialCoordinates: function(latitudeA, longitudeA, latitudeB, longitudeB) {
      var radius = 20;

      //calculate v0(x, y, z)
      var v0y = Math.sin(latitudeA/180 * Math.PI) * radius;
      var anotherRadius = Math.cos(latitudeA/180 * Math.PI) * radius;
      var v0x = Math.cos(longitudeA/180 * Math.PI) * anotherRadius;
      var v0z = Math.sin(longitudeA/180 * Math.PI) * anotherRadius;

      //calculate v2(x,y, z)
      var v2y = Math.sin(latitudeB/180 * Math.PI) * radius;
      anotherRadius = Math.cos(latitudeB/180 * Math.PI) * radius;
      var v2x = Math.cos(longitudeB/180 * Math.PI) * anotherRadius;
      var v2z = Math.sin(longitudeB/180 * Math.PI) * anotherRadius;

      //calculate the mid between v0 and v2
      var midPointX = (v0x + v2x)/2;
      var midPointY = (v0y + v2y)/2;
      var midPointZ = (v0z + v2z)/2;

      //calculate the bistance beween the two dots
      var distance = Math.sqrt(Math.pow(v2x - v0x, 2) + Math.pow(v2y - v0y, 2) + Math.pow(v2z - v0z, 2));

      //calculate multipleVal to get the vector length (distance twice length)
      var multipleVal = Math.pow(distance, 2)/((Math.pow(midPointX, 2)) + (Math.pow(midPointY, 2)) + (Math.pow(midPointZ, 2)));
      //apply the multipleVal to get v1(x, y, z)
      var v1x = midPointX + multipleVal*midPointX;
      var v1y = midPointY + multipleVal*midPointY;
      var v1z = midPointZ + multipleVal*midPointZ;

      // store each coordinate in spaceCoordinatesDataBox
      this.spaceCoordinatesDataBox.v0x = v0x;
      this.spaceCoordinatesDataBox.v0y = v0y;
      this.spaceCoordinatesDataBox.v0z = v0z;
      this.spaceCoordinatesDataBox.v1x = v1x;
      this.spaceCoordinatesDataBox.v1y = v1y;
      this.spaceCoordinatesDataBox.v1z = v1z;
      this.spaceCoordinatesDataBox.v2x = v2x;
      this.spaceCoordinatesDataBox.v2y = v2y;
      this.spaceCoordinatesDataBox.v2z = v2z;

      // also, store them into a global array coordinatesData
      coordinatesDataObj.v0x = v0x;
      coordinatesDataObj.v0y = v0y;
      coordinatesDataObj.v0z = v0z;
      coordinatesDataObj.v1x = v1x;
      coordinatesDataObj.v1y = v1y;
      coordinatesDataObj.v1z = v1z;
      coordinatesDataObj.v2x = v2x;
      coordinatesDataObj.v2y = v2y;
      coordinatesDataObj.v2z = v2z;
    }
  };


})();