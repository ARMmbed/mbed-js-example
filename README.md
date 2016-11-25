# mbed-js-example

Blinky for [JavaScript on mbed](https://developer.mbed.org/javascript-on-mbed/).

## Dependencies

Install:

* A recent version of [node.js](http://nodejs.org/).
* [Gulp](http://gulpjs.com/).
* [mbed CLI](https://github.com/ARMmbed/mbed-cli) and its dependencies.

## Build

1. Run `npm install`.
2. Run `gulp --target=YOUR_TARGET_NAME`.
    * To find your target name, look at the [platforms](http://developer.mbed.org/platforms/) page for your development board.
3. Copy the `mbedos5.hex` or `mbedos5.bin` file from `build/out/YOUR_TARGET_NAME` onto your development board.
4. Blinky will run!
