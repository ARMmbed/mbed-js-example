let ledBrightness = 0;
let ledPin = D0;
let fadeIn = false;
function fadeLED() {
    if ((ledBrightness <= 0) || (ledBrightness >= 1)) {
        fadeIn = !fadeIn;
    }

    setLedBrightness(fadeIn);
}
function setLedBrightness(fadeIn) {
    if (fadeIn) {
        ledBrightness += 0.05;
    }
    else {
        ledBrightness -= 0.05;
    }

    analogWrite(ledPin, ledBrightness);
}

module.exports = fadeLED;