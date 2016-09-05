
var led = DigitalOut(LED1);
var blink = function() {
	print("flash");
	print(led.read());
	led.write(1 - led.read());
}

module.exports = blink;
