var gulp = require('gulp');
var plugins = require('gulp-load-plugins')();
var runSequence = require('run-sequence');
var watchify = require('watchify');
var browserify = require('browserify');
var uglifyify = require('uglifyify');
var mergeStream = require('merge-stream');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var babelify = require('babelify');
var hbsfy = require('hbsfy');
var configurify = require('configurify');

gulp.task('clean', function (done) {
  require('del')(['static/js', 'static/css'], done);
});

gulp.task('css', function () {
  return gulp.src('scss/*.scss')
    .pipe(plugins.sourcemaps.init())
    .pipe(plugins.sass({ outputStyle: 'compressed' }))
    .pipe(plugins.sourcemaps.write('./'))
    .pipe(gulp.dest('static/css'));
});

function createBundler(src) {
  var b;

  if (plugins.util.env.production) {
    b = browserify();
  }
  else {
    b = browserify({
      cache: {}, packageCache: {}, fullPaths: true,
      debug: true
    });
  }

  b.transform(configurify);
  b.transform(babelify.configure({
    stage: 1
  }));

  b.transform(hbsfy);

  if (plugins.util.env.production) {
    b.transform({
      global: true
    }, 'uglifyify');
  }

  b.add(src);
  return b;
}

var bundlers = {
  'page.js': createBundler('./js/page/index.js'),
  'sw.js': createBundler('./js/sw/index.js'),
  'admin.js': createBundler('./js/admin/index.js')
};

function bundle(bundler, outputPath) {
  var splitPath = outputPath.split('/');
  var outputFile = splitPath[splitPath.length - 1];
  var outputDir = splitPath.slice(0, -1).join('/');

  return bundler.bundle()
    // log errors if they happen
    .on('error', plugins.util.log.bind(plugins.util, 'Browserify Error'))
    .pipe(source(outputFile))
    .pipe(buffer())
    .pipe(plugins.sourcemaps.init({ loadMaps: true })) // loads map from browserify file
    .pipe(plugins.sourcemaps.write('./')) // writes .map file
    .pipe(gulp.dest('static/js/' + outputDir));
}

gulp.task('js', function () {
  return mergeStream.apply(null,
    Object.keys(bundlers).map(function(key) {
      return bundle(bundlers[key], key);
    })
  );
});

gulp.task('watch', ['build'], function () {
  gulp.watch(['scss/**/*.scss'], ['css']);

  Object.keys(bundlers).forEach(function(key) {
    var watchifyBundler = watchify(bundlers[key]);
    watchifyBundler.on('update', function() {
      return bundle(watchifyBundler, key);
    });
    bundle(watchifyBundler, key);
  });
});

gulp.task('build', ['js', 'css']);

gulp.task('serve', ['watch'], plugins.shell.task([
  'dev_appserver.py --datastore_path=myapp.datastore --port=9999 --admin_port=9998 app.yaml'
]));

gulp.task('deploy', ['build'], plugins.shell.task([
  'appcfg.py update app.yaml'
]));

gulp.task('default', ['build']);
