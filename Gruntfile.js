module.exports = function(grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        watch: {
            options: {
                livereload: true
            },
            scripts: {
                files: [
                    'app/js/**/*.js'
                ],
                tasks: [
                    'process'
                ]
            }
        },
        concat: {
            dist: {
                src: [
                    'app/js/**/*.js'
                ],
                dest: 'app/prod/js/build.js'
            }
        },
        uglify: {
            dist: {
                options: {
                    banner: '/*!\n * <%= pkg.name %> \n * v<%= pkg.version %> - ' +
                     '<%= grunt.template.today("yyyy-mm-dd") %> \n * Copyright (c) <%= pkg.author %>\n**/',
                    sourceMap: true,
                    sourceMapName: 'app/prod/js/build.min.js.map'
                },
                files: {
                    'app/prod/js/build.min.js': [
                        'app/prod/js/build.js'
                    ]
                }
            }
        }
    });
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-newer');

    grunt.registerTask('process', [
        'newer:concat', 'uglify'
    ]);
    grunt.registerTask('default', [
        'concat', 'uglify', 'watch'
    ]);

    grunt.event.on('watch', function(action, filepath, target) {
        grunt.log.writeln(target + ': ' + filepath + ' has ' + action);
    });
};