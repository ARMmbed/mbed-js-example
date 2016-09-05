
var flash = require('./flash_leds');

setInterval(function() {
	print("blink");
	flash();
}, 1000);
