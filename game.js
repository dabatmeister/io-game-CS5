var socket = io();
var clientID = create_UUID();

var worldWidth;
var worldHeight;
var minSizeToExist;


// frames per second
var clientFPS = 40;


var canvas = document.getElementById('canvas');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
var context = canvas.getContext('2d');


var movement = {
  // when the player is first created it is not moving in the x-direction
  deltaX: 0,
  // when the player is first created it is not moving in the y-direction
  deltaY: 0,
  // this 0 will be overwritten by the actual x coordinate of the player  
  playerX : 0,
  // this 0 will be overwritten by the actual y coordinate of the player
  playerY : 0,
  // this 0 will be overwritten by the actual radius of the player
  radius: 0,
  cID: clientID,
}


window.addEventListener('mousemove', function (e) {
  // the "/2" is needed to correctly calculate the distance between the mouse pointer
  // and the center of the screen
  movement.deltaX = e.pageX-(canvas.width/2);
  // the "/2" is needed to correctly calculate the distance between the mouse pointer
  // and the center of the screen
  movement.deltaY = e.pageY-(canvas.height/2);
});


socket.on('connect', function(data){
  socket.emit('createPlayer',{customID: clientID});
});


socket.on('constants', function(wWidth, wHeight, mSizeToExist, startingPlayerRadius){
  worldWidth = wWidth;
  worldHeight = wHeight;
  movement.radius = startingPlayerRadius;
  minSizeToExist = mSizeToExist;
});


socket.on('disconnect', function(){
  socket.disconnect();
});


setInterval(function() {
  socket.emit('movement', movement);
  coordUpdated = false;
  // the 1000 represents the number of milliseconds in a second
}, 1000 / clientFPS);


socket.on('state', function(players, obstacles, food, monsters, highestScore) {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  // the 0s represent the x and y coordinates of the top left point of this rectangle
  context.clearRect(0, 0, canvas.width, canvas.height);
  if(movement.radius >= minSizeToExist){
    drawGame(players, obstacles, food, monsters, highestScore);
  }
  else{
    console.log(movement.radius);
    console.log(minSizeToExist);
    drawDeathScreen();
  }
});


// this method is from https://www.w3resource.com/javascript-exercises/javascript-math-exercise-23.php
function create_UUID(){
    var dt = new Date().getTime();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        // these numbers work together to create a unique "client id" for each client
        var r = (dt + Math.random()*16)%16 | 0;
        // these numbers work together to create a unique "client id" for each client
        dt = Math.floor(dt/16);
        // these numbers work together to create a unique "client id" for each client
        return (c=='x' ? r :(r&0x3|0x8)).toString(16);
    });
    return uuid;
}


function updateStuff(objects){
    var thisPlayer;
    keys = Object.keys(objects);
    // keysCounter is used to reference elements of keys, a 0-based array, hence it is
    // initialized at 0
    for(keysCounter = 0; keysCounter < keys.length; keysCounter++){
        if(objects[keys[keysCounter]].cID == movement.cID){
          thisPlayer = objects[keys[keysCounter]];
      }
    }
    movement.radius = thisPlayer.radius;
    movement.playerX = thisPlayer.x;
    movement.playerY = thisPlayer.y;
}


function drawGame(players, obstacles, food, monsters, highestScore){
  context.fillStyle = "#e6e6e6";
  // the 0s represent the x and y coordinates of the top left point of this rectangle
  context.fillRect(0, 0, canvas.width, canvas.height);
  var foundSelf = false;
  keys = Object.keys(players);
  // keyCounter is used to reference elements of keys, a 0-based array, hence it is initialized at 0
  for(keyCounter = 0; keyCounter < keys.length; keyCounter++){
    if(players[keys[keyCounter]].cID == movement.cID){
      foundSelf = true;
    }
  }
  if(foundSelf){
    updateStuff(players);
    draw(players, 'red');
  }
  draw(obstacles, '#B1ED8B');
  draw(food, 'yellow');
  draw(monsters, 'orange');
  drawBorders();
  context.fillStyle = "black";
  context.font = "20px Comic Sans MS, cursive, sans-serif";
  // the 50 and -40 are hard-coded values designed to locate the text appropriately on the page
  context.fillText("Score: " + Math.round(movement.radius), 50, window.innerHeight- 40);
  // the -200 and -40 are hard-coded values designed to situate the text appropriately on the page
  context.fillText("Highest Score: " + Math.round(highestScore), window.innerWidth - 200, window.innerHeight- 40);
}


function draw(objects, color){
  for(var id in objects) {
    var object = objects[id];
    // if players are being drawn and the object being drawn right now is the player embodied in this client
    if((color == 'red') && object.cID == (movement.cID)){
      context.fillStyle = 'blue';
    }
    else{
      context.fillStyle = color;
    }
    context.beginPath();
    // the "/2" are needed to correctly draw the locations of the objects, which revolve around that of the
    // player representing this client, which is in the center of the screen
    // the 0 and 2 * Math.pi represent the fact that a complete circle is being drawn
    context.arc(object.x-movement.playerX+(canvas.width/2), object.y-movement.playerY+(canvas.height/2),
      object.radius, 0, 2 * Math.PI);
    context.fill();
  }
}


function drawBorders(){
  context.fillStyle = '#ac7339';
  // the "/2" is needed to correctly draw the locations of the objects relative to the player
  // representing this client
  leftBorderSize = (canvas.width/2)-movement.playerX;
  // the 0 is used to test if the client will attempt to draw beyond the left border of the game area
  if(leftBorderSize > 0){
    // the 0s represent the x and y coordinates of the top left point of this rectangle
    context.fillRect(0, 0, leftBorderSize, canvas.height);
  }

  // the "/2" is needed to correctly draw the locations of the objects relative to the player
  // representing this client
  rightBorderSize = (canvas.width/2)-(worldWidth-movement.playerX);
  // the 0 is used to test if the client will attempt to draw beyond the right border of the game area
  if(rightBorderSize > 0){
    // the 0 represents the y-coordinate of the top left point of this rectangle
    context.fillRect(canvas.width-rightBorderSize, 0, rightBorderSize, canvas.height);
  }

  // the "/2" is needed to correctly draw the locations of the objects relative to the player
  // representing this client
  topBorderSize = (canvas.height/2)-movement.playerY;
  // the 0 is used to test if the client will attempt to draw beyond the top border of the game area
  if(topBorderSize > 0){
    // the 0s represent the x and y coordinates of the top left point of this rectangle
    context.fillRect(0, 0, canvas.width, topBorderSize);
  }

  // the "/2" is needed to correctly draw the locations of the objects relative to the player
  // representing this client
  bottomBorderSize = (canvas.height/2)-(worldHeight-movement.playerY);
  // the 0 is used to test if the client will attempt to draw beyond the bottom border of the game area
  if(bottomBorderSize > 0){
    // the 0 represents the x-coordinate of the top left point of this rectangle
    context.fillRect(0, canvas.height-bottomBorderSize, canvas.width, bottomBorderSize);
  }
}


function drawDeathScreen(){
 context.fillStyle = "black";
  // the 0s represent the x and y coordinates of the top left point of this rectangle
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "red";
  context.font = "60px Comic Sans MS, cursive, sans-serif";
  // the "/2", -100, and -40 all enable the program to situate the text appropriately on the page
  context.fillText("You died", (window.innerWidth/2)-100, (window.innerHeight/2) - 40);
}