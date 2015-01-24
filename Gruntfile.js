module.exports = function(grunt) {

    minify = {
        options: {
            banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
        }, 
        build: {
            src: '<%= pkg.name %>.js',
            dest: '<%= pkg.name %>.min.js'
        }
    };

    // Load the plugin that provides the "uglify" task.
    grunt.loadNpmTasks('grunt-contrib-uglify');
    // load jasmine test runner
    grunt.loadNpmTasks('grunt-contrib-jasmine');

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        uglify: minify,
        jasmine: {
            all: {
                src: 'portal.js',
                options: {
                    specs: 'tests/spec/*.js',
                    helpers: 'tests/spec/Helpers.js',
                    outfile: 'tests/_SpecRunner.html'
                }
            },
            istanbul: {
                src: '<%= jasmine.all.src %>',
                options: {
                    specs: '<%= jasmine.all.options.specs %>',
                    template: require('grunt-template-jasmine-istanbul'),
                    templateOptions: {
                        coverage: 'tests/report/json/coverage.json',
                        report: [
                            {type: 'html', options: {dir: 'tests/report/html'}},
                            {type: 'text-summary'}
                        ]
                    }
                }
            }
        }
    });

    grunt.registerTask('test', ['jasmine:all']);
    grunt.registerTask('coverage', ['jasmine:istanbul']);

    //TODO: release rollback task
    grunt.registerTask('release', 'prep release', function(tag){
        grunt.task.run('uglify', 'update-package-versions:' + tag, 'git-commit-and-tag:' + tag);
    }); 

    grunt.registerTask('update-package-versions', 'update json pkg versions', function(tag){
        // check the tag
        currentVersion = grunt.config.data.pkg.version;
           if (tag <= currentVersion) {
                grunt.log.error(
                    'Tag given: %s must be greater than current tag: %s',
                    currentVersion,
                    tag
                );

                return false;
           } 

            grunt.log.writeln('updating json package versions'); 
            var fs = require('fs');
            // update package/bower json files
            var packageJson = grunt.file.readJSON('package.json');
            packageJson['version'] = tag;
            packageJson = JSON.stringify(packageJson, undefined, 2);
            fs.writeFile('package.json', packageJson, this.async());
            var bowerJson = grunt.file.readJSON('bower.json');
            bowerJson['version'] = tag;
            bowerJson = JSON.stringify(bowerJson, undefined, 2);
            fs.writeFile('bower.json', bowerJson, this.async());
    });

    grunt.registerTask('git-commit-and-tag', 'commit and tag', function(tag){
            var done = this.async();
        
            var commitMsg = 'auto commiting release: ' + tag;

            var path = require('path');
            var curDir = path.resolve(process.cwd());

            var opts = { cwd: curDir};
            var gitAddAll = {
                cmd: 'git',
                args: ['add', '*'],
                opts: opts
            };
            var gitAddDel = {
                cmd: 'git',
                args: ['add', '-u'],
                opts: opts
            };
            var gitCommit = {
                cmd: 'git',
                args: ['commit', '-m', commitMsg],
                opts: opts
            };
            var gitTag = {
                cmd: 'git',
                args: ['tag', tag],
                opts: opts
            };
        
            //TODO : nest spawned processes in preceding spawned proccess callback?
            grunt.log.writeln('git adding');
            grunt.util.spawn(gitAddAll);
            grunt.log.writeln('git adding removed files');
            grunt.util.spawn(gitAddDel);
            grunt.log.writeln('git commiting');
            grunt.util.spawn(gitCommit);
            grunt.log.writeln('git tagging');
            grunt.util.spawn(gitTag, done);

            grunt.log.subhead('Release *almost* complete...');
            [
                'STILL TO DO:',
                '* git push',
                '* git push --tags'
            ].forEach(function(ln){
                grunt.log.writeln(ln);
            });
    });
}
