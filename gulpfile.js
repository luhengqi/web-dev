/*
* @Author: luhengqi
* @Date:   2017-09-18 17:43:59
* @Last Modified by:   Luhengqi
* @Last Modified time: 2017-12-21 17:14:00
*/
var gulp					= require('gulp'),
	watch					= require('gulp-watch'),
	concat					= require('gulp-concat'),
	htmlhint				= require('gulp-htmlhint'),
	rename					= require('gulp-rename'),
	pkg						= require('./package'),
	jshintConfig			= pkg.jshintConfig,
	jshint					= require('gulp-jshint'),
	lesshint				= require('gulp-lesshint'),
	lintspaces				= require('gulp-lintspaces'),
	less					= require('gulp-less'),
	minifyCSS				= require('gulp-csso'),
	LessPluginAutoPrefix	= require('less-plugin-autoprefix'),
	plumber					= require('gulp-plumber'),
	async					= require('async'),
	consolidate				= require('gulp-consolidate'),
	iconfont				= require('gulp-iconfont'),
	iconfontCss				= require('gulp-iconfont-css'),
	tiny					= require('gulp-tinypng-nokey'),
	autoprefix				= new LessPluginAutoPrefix({
		browsers: ['last 5 versions'],
		cascade: true
	});

gulp.task('iconfont', function() {
	var svgSrc      = 'dev/svg/*.svg',
		fontName    = 'icon',
		className   = 'icon',
		timestamp   = Math.round(Date.now() / 1000);

	gulp.src(svgSrc)
		.pipe(iconfont({
			fontName,
			prependUnicode: true, // recommended option
			formats: ['ttf', 'eot', 'woff', 'svg'],
			timestamp, // recommended to get consistent builds when watching files
			fontHeight: 1001,
			descent: 180,//The font descent. It is usefull to fix the font baseline yourself.
			normalize: true
		}))
		.on('glyphs', function(glyphs) {
			var options = {
				className,
				fontName,
				fontPath: 'dist/css/fonts/', // set path to font (from your CSS file if relative)
				glyphs: glyphs.sort((a, b) => {
					return a.name.localeCompare(b.name);
				}).map(mapGlyphs)
			};

			gulp.src('dev/tpl/fonts.css')
				.pipe(consolidate('lodash', options))
				.pipe(rename({
					basename: fontName,
					extname: '.css'
				}))
				.pipe(gulp.dest('dist/css/'));

			gulp.src('dev/tpl/fonts.less')
				.pipe(consolidate('lodash', options))
				.pipe(gulp.dest('dev/less/'));

			gulp.src('dev/tpl/fonts.html')
				.pipe(consolidate('lodash', options))
				.pipe(gulp.dest('dist'));
		})
		.pipe(gulp.dest('dist/css/fonts/'));
});

function mapGlyphs(glyph) {
	return {
		name: glyph.name,
		codepoint: glyph.unicode[0].charCodeAt(0)
	}
}

gulp.task('copy', function() {
	gulp.src(['node_modules/jquery/dist/jquery.min.js'])
		.pipe(rename('jquery.js'))
		.pipe(gulp.dest('dev/js/'));

	gulp.src(['node_modules/normalize.css/normalize.css'])
		.pipe(rename('normalize.less'))
		.pipe(gulp.dest('dev/less/'))
});

gulp.task('tinypng', function() {
	gulp.src('dev/images/*')
		.pipe(tiny())
		.pipe(gulp.dest('dist/images/'));
});

gulp.task('js-hint', function() {
	return gulp.src(['dev/js/*.js', '!dev/js/inview.js'])
		.pipe(jshint(jshintConfig))
		.pipe(jshint.reporter('default'))
});

gulp.task('html-hint', function() {
	return gulp.src(['*.html'])
		.pipe(htmlhint('.htmlhintrc'))
		.pipe(htmlhint.reporter())
});

gulp.task('less', function() {
	return gulp.src(['dev/less/style.less'])
		.pipe(plumber())
		.pipe(less({
			plugins: [autoprefix]
		}))
		.pipe(minifyCSS())
		.pipe(gulp.dest('dist/css'))
});

gulp.task('less-hint', function() {
	return gulp.src(['dev/less/*.less'])
		.pipe(lesshint())
		.pipe(lesshint.reporter('default')) // Leave empty to use the default, "stylish"
		.pipe(lesshint.failOnError()); // Use this to fail the task on lint errors
});

gulp.task('indent-hint', function() {
	return gulp.src(['dev/less/*.less', '*.html', 'dev/js/*.js', '!dev/js/inview.js'])
	.pipe(lintspaces({
		trailingspaces: true,
		indentation: 'tabs',
		ignores: [/\/\*[\s\S]*?\*\//g, /foo bar/g ]
	}))
	.pipe(lintspaces.reporter())
});

gulp.task('watch', function() {
	gulp.watch(['dev/less/*.less'], ['less-hint', 'less']);
	gulp.watch(['dev/less/*.less', '*.html', 'dev/js/*.js'], ['indent-hint']);
	gulp.watch(['*.html'], ['html-hint']);
	gulp.watch(['dev/js/*.js'], ['js-hint']);
	gulp.watch(['dev/svg/*.svg'], ['iconfont']);
	gulp.watch(['dev/images/*'], ['tinypng']);
});
