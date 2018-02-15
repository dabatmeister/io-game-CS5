var canvas = document.querySelector('canvas');

// - setting the width and height of the canvas on the screen
// - can multiply by numbers/variables to extend canvas beyond 
//   limitations of screen
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

var c = canvas.getContext('2d');

// How to draw a rectangle and color things
// c.fillStyle = 'rgba(255, 0, 0, 0.5)';
// c.fillRect(100, 100, 100, 100)

console.log(canvas);

// Line Work
// - need this to make sure that each specific shape doesn't connect to the
  // shape that was drawn previously, making sure it's standing on it's own
// c.beginPath();
// c.moveTo(50, 300);
// c.lineTo(300, 100);
// - need this line to have shape appear in screen
// c.stroke();

// Arc ~ Circle Work
// c.beginPath();
// - c.arc(x-coordinate, y-coordinate, radius, startAngle, endAngle, 
		   // counterClockWise boolean)
// - start/end Angle uses radians, and to make a full circle, use 0 for
  // startAngle and Math.PI * 2 for endAngle
// c.arc(300, 300, 30, 0, Math.PI * 2, false);
// c.stroke();

// for( var i = 0; i < 15; i++)
// {
	// var x = Math.random() * window.innerWidth;
	// var y = Math.random() * window.innerHeight;
	// c.beginPath();
	// c.arc(x, y, 30, 0, Math.PI * 2, false);
	// c.stroke();	
// }

// Animation Work
c.beginPath();
c.arc(200, 200, 30, 0, Math.PI * 2, false);
c.strokeStyle = 'blue';
c.stroke();	

var x = 200;
var y = 200;
var dx = 4;
var dy = 4;
var radius = 30;
function animate()
{
	// - basically telling what method needs to be run in order to animate
	//   the object and what's being animated aka recursion
	requestAnimationFrame(animate);
	
	// - clearing the canvas so that it gives the illusion of moving
	c.clearRect(0, 0, innerWidth, innerHeight);
	
	c.beginPath();
	c.arc(x, 200, radius, 0, Math.PI * 2, false);
	c.strokeStyle = 'blue';
	c.stroke();	
	
	// - making it so that it looks like it's bouncing from wall to wall
	if( x + radius > innerWidth || x - radius < 0)
	{
		dx = -dx;
	}
	
	if( y + radius > innerHeight || y - radius < 0)
	{
		dy = -dy;
	}
	
	// - incrementing the circle
	x += dx;
	y += dy;
}

animate();















