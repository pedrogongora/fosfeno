var gulp = require('gulp');
var browserify = require('browserify');
var source = require('vinyl-source-stream');
var watchify = require('watchify');
var fancy_log = require('fancy-log');
var tsify = require('tsify');
var paths = {
    pages: ['demo/*.html']
};

var watchedBrowserify = watchify(browserify({
    basedir: '.',
    debug: true,
    entries: ['demo/src/main.ts'],
    cache: {},
    packageCache: {}
})).plugin( tsify );

//gulp.task('copy-html', function () {
//    return gulp.src( paths.pages )
//        .pipe( gulp.dest('dist') );
//});

function bundle() {
    return watchedBrowserify
        .bundle()
        .pipe( source('bundle.js') )
        .pipe( gulp.dest('demo') );
}

//gulp.task('default', gulp.series(gulp.parallel('copy-html'), bundle));
gulp.task('default', bundle);
watchedBrowserify.on('update', bundle);
watchedBrowserify.on('log', fancy_log);