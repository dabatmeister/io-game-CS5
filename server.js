// Dependencies
var express = require('express');
var http = require('http');
var path = require('path');
var socketIO = require('socket.io');
var app = express();
var server = http.Server(app);
var io = socketIO(server);
// The 5000 is the number of the port
app.set('port', 5000);
app.use('/static', express.static(__dirname + '/static'));
// Routing
app.get('/', function(request, response) {
  response.sendFile(path.join(__dirname, 'index.html'));
});
// Starts the server. The 5000 is the number of the port.
server.listen(5000, function() {
  console.log('Starting server on port 5000');
});

//players dictionary
var players = {};

// These two variables have the same meaning as the equivalently named ones in client.js
var worldWidth = 1800;
var worldHeight = 1500;

// These values determine the rate at which damage is dealt by different elements within the game
var monsterAndPlayerDamage = 200;
var obstacleDamage = 200;

// length of the array determines how many obstacles there will be on the map
var obstacles = new Array(8);

// length of the array determines how many monsters there will be on the map
var monsters = new Array(2);

// The map starts with no food, food gets pushed and pulled to this array as it is spawned and eaten
var food = new Array(0);

// How much area of a player/monster should grow then it eats a food piece
var growthThroughEatingFood = 2000;

// radius of food piece
var foodRadius = 5;

// maximum radius monsters can have is also their starting radius
var maxAndStartingMonsterRadius = 55;

// player radius at the start of the game
var startingPlayerRadius = 30;

// cap on the number of food pieces that can exist at once
var maxAmountOfFood = 5;

// players/monsters with radii under this value will be deleted
var minSizeToExist = 0.02;

// This variable keeps track of how many intervals have passed. Every time it reaches 40 (every second) it resets to zero. It is used to make food appear at a different rate than the game updates.
var intervalCounter = 0;


function component(paramX, paramY, paramRadius){
  this.x = paramX; 
  this.y = paramY;
  this.radius = paramRadius;
}


component.prototype.touchingObstacle = function(){
  for(let potentialObstacle of obstacles){
    // ...compute the distance between the obstacle and player sprite using the pythagorean theorem...
    obstacleDistance = computeDistance(this.x, this.y, potentialObstacle.x, potentialObstacle.y);
    // ...if the player's sprite overlaps with the obstacle...
    // the 6 exists to make the game more visually appealing. This way, if the component is very
    // close to but barely not touching the obstacle, the method will pretend that it is touching
    // that obstacle anyway.
    if(obstacleDistance < (this.radius + potentialObstacle.radius + 6)){
    	return true;
    }
  }
  return false;
}


// used to grow/shrink the component
component.prototype.changeArea = function(amount){
  // the 2 is used to square this.radius
  oldArea = Math.pow(this.radius,2)*Math.PI;
  // The 0 is used to test if the area of the component needs to be shrunk (versus increased)
  if((oldArea <= Math.abs(amount)) && (amount < 0)){
    // the .01 is an arbitrarily small number that ensures the component will be deleted because
    // its radius < minSizeToExist
    this.radius = .01;
  }
  else{
    this.radius = Math.sqrt((oldArea+amount)/Math.PI);
  }
}


function player(paramX, paramY){
  component.call(this, paramX, paramY, startingPlayerRadius);
  this.emitted = true;
}
player.prototype = Object.create(component.prototype);
player.prototype.constructor = player;


function computeDistance(obj1x, obj1y, obj2x, obj2y){
  // this is the pythagorean theorem, the 2s and 0.5 are used to square then square root quantities
  return Math.pow((Math.pow((obj1x-obj2x), 2) + Math.pow((obj1y-obj2y), 2)), 0.5);
}


function playersDamageEachOther(){
	keys = Object.keys(players);
  // the 0 and -1 ensure that the outer for loop starts by looking at the first element in keys
  // and ends by looking at the second to last element in keys
  for(outer = 0; outer < (keys.length-1); outer ++){
    // the 1 ensures that the inner for loop starts by looking at the element in keys immediately after the
    // element which will be referenced by "outer"
    for(inner = (outer + 1); inner < keys.length; inner++){
      rOuter = players[keys[outer]].radius;
      rInner = players[keys[inner]].radius;
      if(computeDistance(players[keys[outer]].x, players[keys[outer]].y, players[keys[inner]].x, players[keys[inner]].y) <= (rOuter + rInner)){
        // the +3 makes the game more visually appealing. It ensures that players only damage each other if one is noticeably
        // larger than the other
        if(rOuter > (rInner + 3)){
          players[keys[outer]].changeArea(monsterAndPlayerDamage);
          players[keys[inner]].changeArea(- monsterAndPlayerDamage);
        }
        // the +3 makes the game more visually appealing. It ensures that players only damage each other if one is noticeably
        // larger than the other
        else if(rInner > (rOuter + 3)){
          players[keys[inner]].changeArea(monsterAndPlayerDamage);
          players[keys[outer]].changeArea(- monsterAndPlayerDamage);
        }
      }
    }
  }
}


function obstacle(paramX, paramY, paramRadius){
  component.call(this, paramX, paramY, paramRadius);
}


obstacle.prototype = Object.create(component.prototype);
obstacle.prototype.constructor = obstacle;



function getNewRandomCoordinates(spawningObjectRadius){
  while(true){
    potentialX = (Math.random()*(worldWidth-spawningObjectRadius)) + spawningObjectRadius;
    potentialY = (Math.random()*(worldHeight-spawningObjectRadius)) + spawningObjectRadius;
    allOk = noConflicts(obstacles, spawningObjectRadius, potentialX, potentialY);
    if(allOk){
      allOk = noConflicts(players, spawningObjectRadius, potentialX, potentialY);
      if(allOk){
        return[potentialX, potentialY];
      }
    }
  }
}



function noConflicts(objects, spawningObjectRadius, xCoord, yCoord){
  keys = Object.keys(objects);
  // the 0 ensures that the for loop starts at the first element in keys
  for(ii = 0; ii < keys.length; ii++){
    distance = computeDistance(objects[keys[ii]].x, objects[keys[ii]].y, xCoord, yCoord);
    // the +5 enhances the game's visual appeal because it ensures that a new object won't spawn immediately
    // next to an already existing one
    if(distance < (objects[keys[ii]].radius+spawningObjectRadius+5)){
      return false;
    }
  }
  return true;
}



function foodPiece(paramX, paramY){
  component.call(this, paramX, paramY, foodRadius);
}
foodPiece.prototype = Object.create(component.prototype);
foodPiece.prototype.constructor = foodPiece;



function updateIntervalCounter(){
  // The 40 ensures that this if statement will be true only when one second has passed
  // since the last piece of food was added...
  if(intervalCounter == 40){
    if(food.length < maxAmountOfFood){
      //...add a new food to the end of the food array...
      newCoordinates = getNewRandomCoordinates(foodRadius);
      // the 0 and 1 point to the elements of newCoordinates containing the x and y coordinates,
      // respectively, of the new food piece
      var newFood = new foodPiece(newCoordinates[0], newCoordinates[1]);
      newFood.prototype = Object.create(component.prototype);
      food.push(newFood);
    }
    //  the 0 resets the interval counter.
    intervalCounter = 0;
  }
  else{
    intervalCounter++;
  }
}



function checkFood(){
  // this counter represents the index of the food piece the player/monster will try to eat
  // hence it starts at 0 because that way it starts by pointing to the first element in the food
  // array
  foodDeleteCounter = 0;
  keys = Object.keys(players);
  while(foodDeleteCounter < food.length){
    // i is used to access elements in the keys array; the first element in this array has an index
    // of 0, hence i starts at 0
    for(i = 0; i < keys.length; i++){
      foodDeleteCounter = tryToEat(players[keys[i]], foodDeleteCounter);
    }
    for(let checkMonster of monsters){
      // the -2 prevents monsters that are technically
      // under their max size, but so close to their max size that it appears to the naked eye
      // that they are at their max size, from eating food
      if(checkMonster.radius < (maxAndStartingMonsterRadius - 2)){
        foodDeleteCounter = tryToEat(checkMonster, foodDeleteCounter);
      }
    }
    foodDeleteCounter++;
  }
}


function tryToEat(eater, foodNum){
  // this if statement catches the case where array of food was only 1 long and the food was
  // already eaten.
  if(foodNum >= 0){
    distance = computeDistance(eater.x, eater.y, food[foodNum].x, food[foodNum].y);
    /// if the player/monster overlaps with the food
    if(distance <= (eater.radius + foodRadius)){
      eater.changeArea(growthThroughEatingFood);
      // The "1" parameter makes its so that only one food element will be spliced.
      food.splice(foodNum, 1);
      // Subtract 1 from foodNum so that foodCounter in checkFood() is decreased by
      // 1, to account for the change in indexing of all remaining food pieces after the food array
      // is spliced.
      return (foodNum - 1);
    }
    else{
      return foodNum;
    }
  }
}


function monster(x, y){
  component.call(this, x, y, maxAndStartingMonsterRadius);
  keys = Object.keys(players);
} 
monster.prototype = Object.create(component.prototype);
monster.prototype.constructor = monster;


function moveMonsters(){
  // i starts at 0 because it is used to access elements of the monsters array, the first 
  // element of which has an index of 0
  for(i = 0; i < monsters.length; i++){
    if(monsters[i].radius < minSizeToExist){
      var spawnCoordinates = getNewRandomCoordinates(maxAndStartingMonsterRadius);
      // the 0 and 1 access elements within the spawnCoordinates array that represent the
      // x and y coordinates, respectively, of the spawn location of the newly created monster
      monsters[i] = new monster(spawnCoordinates[0], spawnCoordinates[1]);
    }
    monsters[i].changePosition(monsters[i].findPlayerToChase());                       
  }
}


monster.prototype.findPlayerToChase = function(){
  keys = Object.keys(players);
  // 9999 is aribtraily large distance that makes it so that the first number
  // in the distances array will seem smaller
  var shortestDistance = 999999;
  // players[keys[closestPlayer]] represents the closest player to this monster.
  // closestPlayer starts as -1 because this value does not point to any player
  // in the players array, which makes sense because no player has been identified
  // as the "closest" yet
  var playerToChase = -1;
  // the distances array represents the distances between this monster and the players.
  // distances[1], for example, represents the distance between this monster and
  // players[keys[1]].
  this.distances = new Array(keys.length);
  // k is used to iterate through distances, which is a 0-based array, hence it starts
  // with a value of 0
  for(k = 0; k < this.distances.length; k++){
    this.distances[k] = computeDistance(this.x, this.y, players[keys[k]].x, players[keys[k]].y);
    if((this.distances[k] < shortestDistance) && (players[keys[k]].radius < this.radius)){
      shortestDistance = this.distances[k];
      playerToChase = k;
    }
  }
  return playerToChase;
}


monster.prototype.changePosition = function(playerToChase){
  keys = Object.keys(players);
  var horizontalDistance;
  var verticalDistance;
  // the 60 is a multiplier used to tweak the monster's speed
  var monsterSpeed = 60;
  var monsterSpeedX;
  var monsterSpeedY;
  // the -1 represents the possibility that there is no player whom the monster can chase
  if(playerToChase == -1){
      // set speedX and speedY to 0 because the monster should be stationary if it isn't chasing anyone
    monsterSpeedX = 0;
    monsterSpeedY = 0;
  }
  else{
    horizontalDistance = players[keys[playerToChase]].x-this.x;
    verticalDistance = players[keys[playerToChase]].y-this.y;
    // the 2 and 0.5 are used to square and square root values, respectively
    // the 1 is part of the algebra used to determine the magnitude of monsterSpeedX given a fixed
    // total speed (called monsterSpeed)
    monsterSpeedX = (Math.pow(Math.pow(monsterSpeed,2)/(1+(Math.pow(verticalDistance,2)/Math.pow(horizontalDistance,2))),0.5))/(this.radius);
    // the 0 is used to test whether the monster is to the right of the player
    if(horizontalDistance < 0){
      // the -1 negates the monster speed
      monsterSpeedX *= -1;
    }
    monsterSpeedY = monsterSpeedX * verticalDistance/horizontalDistance;
  }
  this.x = this.x + monsterSpeedX;
  this.y = this.y + monsterSpeedY; 
}


monster.prototype.changeArea = function(amount){
  // the 0 is used to test if the program wants to shrink the monster
  if(amount < 0){
    component.prototype.changeArea.call(this, amount);
  }
  else{
    newRadius = this.radius + Math.sqrt(amount/Math.PI);
    if(newRadius >= maxAndStartingMonsterRadius){
      this.radius = maxAndStartingMonsterRadius;
    }
    else{
      this.radius = newRadius;
    }
  }
}

io.on('connection', function(socket) {
  socket.setMaxListeners(Infinity);
  socket.on('createPlayer', function (data) {
    var newPlayerCoordinates = getNewRandomCoordinates(startingPlayerRadius);
    // the 0 and 1 reference the x and y coordinates, respectively, of the location where the new
    // player will spawn
    players[socket.id] = new player(newPlayerCoordinates[0], newPlayerCoordinates[1]);
    players[socket.id].cID = data.customID;
  });


  socket.on('movement', function(data) {
    var thePlayer = players[socket.id] || {};
    if (data.deltaX && data.deltaY) {
      var playerSpeed = computeSpeed(data.deltaX, data.deltaY, thePlayer.radius);
      // If the player is moving right and it's at the right edge of the game area.
      // The first 0 is used to test the player's speed, and the second is used to
      // bring it to a stop if it needs to be stopped.
      if((playerSpeed["x"] > 0) && ((thePlayer.x + thePlayer.radius) >= worldWidth)){
        playerSpeed["x"] = 0;
      };
      // If the player is moving left and it's at the left edge of the game area.
      // The first 0 is used to test the player's speed, and the second is used to
      // bring it to a stop if it needs to be stopped.
      if((playerSpeed["x"] < 0) && ((thePlayer.x - thePlayer.radius) <= 0)){
        playerSpeed["x"] = 0;
      };
      // If the player is moving down and it's at the bottom edge of the game area.
      // The first 0 is used to test the player's speed, and the second is used to
      // bring it to a stop if it needs to be stopped.
      if((playerSpeed["y"] > 0) && ((thePlayer.y + thePlayer.radius) >= worldHeight)){
      	playerSpeed["y"] = 0;
      };
      // If the player is moving up and it's at the top edge of the game area.
      // The first 0 is used to test the player's speed, and the second is used to
      // bring it to a stop if it needs to be stopped.
      if((playerSpeed["y"] < 0) && ((thePlayer.y - thePlayer.radius) <= 0)){
        playerSpeed["y"] = 0;
      };
      thePlayer.x = thePlayer.x + playerSpeed["x"];
      thePlayer.y = thePlayer.y + playerSpeed["y"]; 
    }
    if(thePlayer.radius < minSizeToExist){
      delete players[socket.id];
    }
  });

  socket.on('disconnect', function (data) {
    delete players[socket.id];
  });

});



function computeSpeed(deltaX, deltaY, radius){
  var toReturn = {};
  // the 0 is used to test if the player is moving to the left
  var deltaXNeg = (deltaX < 0);
  // the 0 is used to test if the player is moving up
  var deltaYNeg = (deltaY < 0);
  // The 0.5 is used to square root a value
  // the 1.5 is a multiplier to tweak the player's speed
  magnitudePlayerSpeedX = Math.pow((Math.abs(deltaX))/(radius),0.5)*1.5;
  magnitudePlayerSpeedY = Math.pow((Math.abs(deltaY))/(radius),0.5)*1.5;
  if(deltaXNeg){
    toReturn["x"] = -magnitudePlayerSpeedX;
  }
  else{
    toReturn["x"] = magnitudePlayerSpeedX;
  }
  if(deltaYNeg){
    toReturn["y"] = -magnitudePlayerSpeedY;
  }
  else{
    toReturn["y"] = magnitudePlayerSpeedY;
  }
  return toReturn;
}



function obstaclesDamageMonstersAndPlayers(){
  // j is used to reference elements in monsters, which is a 0-based array, hence it
  // is initialized at a value of 0
	for(j = 0; j < monsters.length; j++){
    if(monsters[j].touchingObstacle()){
       monsters[j].changeArea(- obstacleDamage);
    }
  }
  keys = Object.keys(players);
  // i is used to reference elements in keys, which is a 0-based array, hence it
  // is initialized at a value of 0
  for(i = 0; i < keys.length; i++){
    if(players[keys[i]].touchingObstacle()){
      players[keys[i]].changeArea(- obstacleDamage);
    }
  }
}


function monstersAndPlayersDamageEachOther(){
  keys = Object.keys(players);
  for(let monsterToExamine of monsters){
    // playerChecker is used to reference elements in a monster's distances array,
    // which is 0-based, hence playerChecker is initialized at 0
    for(playerChecker = 0; playerChecker < monsterToExamine.distances.length; playerChecker++){
      // if monster is touching a player
      if(monsterToExamine.distances[playerChecker] <= (monsterToExamine.radius + players[keys[playerChecker]].radius)){
        //if monster should damage player
        if(monsterToExamine.radius > players[keys[playerChecker]].radius){
          monsterToExamine.changeArea(monsterAndPlayerDamage);
          players[keys[playerChecker]].changeArea(- monsterAndPlayerDamage);
        }
        // if player should damage monster
        else{
          monsterToExamine.changeArea(- monsterAndPlayerDamage);
          players[keys[playerChecker]].changeArea(monsterAndPlayerDamage);
        }
      }
    }
  }
}


// iii is used to reference elements in obstacles, which is a 0-based array, hence it is
// initialized at 0
for(iii = 0; iii < obstacles.length; iii++){
  createObstacle(iii);
}


function createObstacle(obsIndex){
  // the 20 represents the minimum radius value
  // the 100 represents the range of possible values the radius variable could take
  radius = (Math.random()*100)+20;
  var coordinates = getNewRandomCoordinates(radius);
  // the 0 and 1 reference the x and y coordinates, respectively, of the
  // location of this obstacle
  obstacles[obsIndex] = new obstacle(coordinates[0], coordinates[1], radius);
}


var monsterSpawnCoordinates = getNewRandomCoordinates(maxAndStartingMonsterRadius);
// the 0 and 1 reference the x and y coordinates, respectively, of the
// spawn location of this monster
monsters[0] = new monster(monsterSpawnCoordinates[0], monsterSpawnCoordinates[1]);
monsterSpawnCoordinates = getNewRandomCoordinates(maxAndStartingMonsterRadius);
// the 0 and 1 reference the x and y coordinates, respectively, of the
// spawn location of this monster
monsters[1] = new monster(monsterSpawnCoordinates[0], monsterSpawnCoordinates[1]);


function findHighestScore(){
  keys = Object.keys(players);
  // highestScore is initialized at 0 because no highest score has been recorded yet
  highestScore = 0;
  // jjj references elements in keys, a 0-based array, hence it is initialized at 0
  for(jjj = 0; jjj < keys.length; jjj++){
    playerR = players[keys[jjj]].radius;
    if(playerR > highestScore){
      highestScore = playerR;
    }
  }
  return highestScore;
}


setInterval(function() {
    playersDamageEachOther();
    obstaclesDamageMonstersAndPlayers();
    checkFood();
    updateIntervalCounter();
    moveMonsters();
    monstersAndPlayersDamageEachOther();
    io.sockets.emit('state', players, obstacles, food, monsters, findHighestScore());
// the 40 represents the number of times the code within setInterval() will be run per second
// the 1000 represents the number of milliseconds in a second
}, 1000 / 40);