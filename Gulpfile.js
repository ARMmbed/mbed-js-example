'use strict';

const gulp = require('gulp');
const run = require('gulp-run');
const util = require('gulp-util');
const print = require('gulp-print');
const filter = require('gulp-filter');
const uglify = require('gulp-uglify');
const rename = require('gulp-rename');
const template = require('gulp-template');

const browserify = require('browserify');
const promisify = require('promisify-node');

const buffer = require('vinyl-buffer');
const source = require('vinyl-source-stream');

const fs = require('fs');
const del = require('del');
const exec = require('child-process-promise').exec;

const node_package = JSON.parse(fs.readFileSync('./package.json'));

gulp.task('bundle', function() {
    const b = browserify({
        entries: node_package.main
    });

    return b.bundle()
            .pipe(source(node_package.name + '.bundle.js'))
            .pipe(buffer())

            // output bundled js
            .pipe(gulp.dest('./build/js/'))

            // produce minified js
            .pipe(uglify())
            .pipe(rename(node_package.name + '.bundle.min.js'))
            .pipe(gulp.dest('./build/js/'));
});

function cpp_name_sanitise(name) {
    let out_name = name.replace(new RegExp('-', 'g'), '_')
                       .replace(new RegExp('\\\\', 'g'), '_')
                       .replace(new RegExp('\\?', 'g'), '_')
                       .replace(new RegExp('\'', 'g'), '_')
                       .replace(new RegExp('"', 'g'), '_');

    if ("0123456789".indexOf(out_name[0]) != -1) {
        out_name = '_' + out_name;
    }

    return out_name;
}

function cpp_string_sanitise(string) {
    let out_str = string.replace(new RegExp('\\\\', 'g'), '\\\\')
                        .replace(new RegExp("\n", 'g'), "\\n")
                        .replace(new RegExp("\"", 'g'), '\\"');

    return out_str;
}

gulp.task('cppify', ['bundle', 'pins.js'], function() {
    let out_js = {
        name: cpp_name_sanitise(node_package.name),
        path: "./build/js/" + node_package.name + ".bundle.min.js"
    };

    const source = fs.readFileSync(out_js.path, {
        'encoding': 'utf-8'
    });

    out_js.source_length = source.length;
    out_js.source = cpp_string_sanitise(source);

    return parse_pins('./build/js/pins.js')
            .then(function(pins) {
                return gulp.src('tmpl/js_source.cpp.tmpl')
                            .pipe(rename(node_package.name + '_js_source.cpp'))
                            .pipe(template({
                                js_files: [out_js],
                                magic_strings: pins
                            }))
                            .pipe(gulp.dest('./build/source/'));
            });
});

gulp.task('ignorefile', function() {
    return gulp.src('tmpl/mbedignore.tmpl')
               .pipe(rename('.mbedignore'))
               .pipe(gulp.dest('./build/'));
});

gulp.task('makefile', function() {
    return gulp.src('tmpl/Makefile.tmpl')
               .pipe(rename('Makefile'))
               .pipe(gulp.dest('./build/'));
});

gulp.task('clean', function() {
    return del(['build']);
});

gulp.task('get-jerryscript', ['makefile'], function() {
    return run('make jerryscript', { cwd: './build' }).exec();
});

gulp.task('pins.js', ['get-jerryscript'], function() {
    const variant = util.env_target == 'K64F' ? 'FRDM' : '';
    var cmd = 'find ./build/jerryscript/targets/mbedos5/js/pin_defs/ -iname pins.js';
    return promisify(exec)(cmd)
            .then(function(result) {
                const files = result.stdout.split('\n').filter(function(line) {
                    return (line.indexOf('TARGET_' + util.env.target) != -1)
                        || (line.indexOf('TARGET_MCU_' + util.env.target) != -1
                            && line.indexOf('TARGET_' + variant) != -1)
                });

                const source = files[0];
                return gulp.src(source)
                        .pipe(rename('pins.js'))
                        .pipe(gulp.dest('./build/js/'));
            });
});

function list_libs() {
    return Promise.all(Object.keys(node_package.dependencies).map(function(dep) {
        const path = 'node_modules/' + dep + '/mbedjs.json';
        return promisify(fs.stat)(path)
                .then(function() {
                    return promisify(fs.readFile)(path);
                })
                .then(function(data) {
                    const json_data = JSON.parse(data);
                    return {
                        name: dep,
                        abs_source: json_data.source.map(function(dir) {
                            return '../../../../node_modules/' + dep + '/' + dir
                        }),
                        config: json_data
                    };
                });
    }));
}

function parse_pins(path) {
    return promisify(fs.readFile)(path, { encoding: 'utf-8' }).then(function(pin_data) {
        return pin_data.split('\n')
                .filter(function(line) {
                    let bits = line.split(' ');
                    return bits.length == 4;
                })
                .map(function(line) {
                    let bits = line.split(' ');

                    return {
                        name: bits[1],
                        value: bits[3].slice(0, -1)
                    };
                });
    });
}

gulp.task('build', ['cppify', 'ignorefile', 'makefile'], function() {
    return list_libs()
            .then(function(libs) {
                var gulp_stream = gulp.src('tmpl/main.cpp.tmpl')
                                    .pipe(rename('main.cpp'))
                                    .pipe(template({
                                        libraries: libs
                                    }))
                                    .pipe(gulp.dest('./build/source/'));

                var end = new Promise(function(resolve, reject) {
                    gulp_stream.on('end', function() {
                        resolve();
                    });
                });
            
                end.then(function() {
                    var lib_source_files = libs.map(function(lib) { return lib.abs_source.join(' '); }).join(' ');
                    return run('make BOARD=' + util.env.target + ' EXTRAS="' + lib_source_files + '"', { cwd: './build', verbosity: 3 }).exec()
                        .pipe(print())
                        .pipe(rename('build.log'))
                        .pipe(gulp.dest('./build'));
                });
            })
});

gulp.task('default', ['build']);
