/*
* @Author: luhengqi
* @Date:   2017-09-18 17:43:59
* @Last Modified by:   luhengqi
* @Last Modified time: 2017-12-24 20:08:12
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
	batch					= require('gulp-batch'),
	del						= require('del'),
	tiny					= require('gulp-tinypng-nokey'),
	autoprefix				= new LessPluginAutoPrefix({
		browsers: ['last 5 versions'],
		cascade: true
	});

var paths = {
	dist: 'dist/',
	svgs: {
		dev: 'dev/svg/',
		tpl: 'dev/tpl/',
		fonts: 'dist/css/fonts/'
	},
	images: {
		dev: 'dev/images/',
		dist: 'dist/images/'
	},
	styles: {
		dev: 'dev/less/',
		dist: 'dist/css/'
	},
	scripts: {
		dev: 'dev/js/',
		dist: 'dist/js/'
	}
};

gulp.task('cleanIconfont', function() {
	del([
		paths.styles.dist + '**',
		paths.styles.dev + 'fonts.less',
		paths.dist + 'fonts.html'
	]).then(console.log);
});

gulp.task('iconfont', function() {
	var fontName    = 'icon',
		className   = 'icon',
		timestamp   = Math.round(Date.now() / 1000);

	gulp.src(paths.svgs.dev + '*.svg')
		.pipe(iconfont({
			fontName: fontName,
			prependUnicode: false, // recommended option
			formats: ['ttf', 'eot', 'woff', 'svg'],
			timestamp: timestamp, // recommended to get consistent builds when watching files
			fontHeight: 1001,
			descent: 180, //The font descent. It is usefull to fix the font baseline yourself.
			normalize: true
		}))
		.on('glyphs', function(glyphs) {
			var options = {
				className: className,
				fontName: fontName,
				fontPath: paths.svgs.fonts, // set path to font (from your CSS file if relative)
				glyphs: glyphs.sort(function(a, b) {
					return a.name.localeCompare(b.name);
				}).map(mapGlyphs)
			};

			gulp.src(paths.svgs.tpl + 'fonts.css')
				.pipe(consolidate('lodash', options))
				.pipe(rename({
					basename: fontName,
					extname: '.css'
				}))
				.pipe(gulp.dest(paths.styles.dist));

			gulp.src(paths.svgs.tpl + 'fonts.less')
				.pipe(consolidate('lodash', options))
				.pipe(gulp.dest(paths.styles.dev));

			gulp.src(paths.svgs.tpl + 'fonts.html')
				.pipe(consolidate('lodash', options))
				.pipe(gulp.dest('dist'));
		})
		.pipe(gulp.dest(paths.svgs.fonts));
});

function mapGlyphs(glyph) {
	return {
		name: glyph.name,
		codepoint: glyph.unicode[0].charCodeAt(0)
	};
}

gulp.task('copy', function() {
	gulp.src(['node_modules/jquery/dist/jquery.min.js'])
		.pipe(rename('jquery.js'))
		.pipe(gulp.dest(paths.scripts.dev));

	gulp.src(['node_modules/normalize.css/normalize.css'])
		.pipe(rename('normalize.less'))
		.pipe(gulp.dest(paths.styles.dev));
});

gulp.task('cleanTinypng', function() {
	del([paths.images.dist + '*']).then(console.log);
});

gulp.task('tinypng', function() {
	gulp.src(paths.images.dev + '*')
		.pipe(tiny())
		.pipe(gulp.dest(paths.images.dist));
});


gulp.task('jsMin', function(){
	return gulp.src([
			'dev/js/common.js'
		])
		.pipe(jshint(jshintConfig))
		.pipe(jshint.reporter('default'))
		.pipe(uglify())
		.pipe(concat('common.js'))
		.on('error', showError)
		.pipe(gulp.dest('js'));
});

gulp.task('js-hint', function() {
	return gulp.src([
			paths.scripts.dev + '*.js'
		])
		.pipe(jshint(jshintConfig))
		.pipe(jshint.reporter('default'));
});

gulp.task('html-hint', function() {
	return gulp.src([paths.dist + '*.html'])
		.pipe(htmlhint('.htmlhintrc'))
		.pipe(htmlhint.reporter());
});

gulp.task('less', function() {
	return gulp.src([paths.styles.dev + 'style.less'])
		.pipe(plumber())
		.pipe(less({
			plugins: [autoprefix]
		}))
		.pipe(minifyCSS())
		.pipe(gulp.dest(paths.styles.dist));
});

gulp.task('less-hint', function() {
	return gulp.src([paths.styles.dev + '*.less'])
		.pipe(lesshint())
		.pipe(lesshint.reporter('default')) // Leave empty to use the default, "stylish"
		.pipe(lesshint.failOnError()); // Use this to fail the task on lint errors
});

gulp.task('indent-hint', function() {
	return gulp.src([
		paths.styles.dev + '*.less',
		paths.dist + '*.html',
		paths.scripts.dev + '*.js',
		'!' + paths.styles.dev + 'normalize.less'
	])
	.pipe(lintspaces({
		trailingspaces: true,
		indentation: 'tabs',
		ignores: [/\/\*[\s\S]*?\*\//g, /foo bar/g ]
	}))
	.pipe(lintspaces.reporter());
});

gulp.task('default', function() {
	gulp.watch(paths.styles.dev + '*.less', ['less-hint', 'less', 'indent-hint']);
	gulp.watch(paths.dist + '*.html', ['html-hint', 'indent-hint']);
	gulp.watch(paths.scripts.dev + '*.js', ['jsMin', 'js-hint', 'indent-hint']);

	watch(paths.svgs.dev + '*.svg', batch(function(events, cb) {
		events.on('data', function() {
			gulp.start(['cleanIconfont', 'iconfont']);
		}).on('end', cb);
	}));

	watch(paths.images.dev + '*', batch(function(events, cb) {
		events.on('data', function() {
			gulp.start(['cleanTinypng', 'tinypng']);
		}).on('end', cb);
	}));
});
