const gulp = require('gulp');
const fsn = require('fs-nextra');
const ts = require('gulp-typescript');
const sourcemaps = require('gulp-sourcemaps');
const merge = require('merge2');
const project = ts.createProject('tsconfig.json');

async function build() {
  await Promise.all([
    fsn.emptydir('dist'),
  ]);

  const result = project.src()
    .pipe(sourcemaps.init())
    .pipe(project());

  return merge([
    result.js.pipe(sourcemaps.write('.', { sourceRoot: '../src' })).pipe(gulp.dest('dist')),
    result.dts.pipe(gulp.dest('dist/typings'))
  ]);
}

gulp.task('default', build);
gulp.task('build', build);