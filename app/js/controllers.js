'use strict';

/* Controllers */

angular.module('Shri.controllers', [
    'Shri.i18n'
])
    .controller('PageCtrl', ['$scope', '_', function($scope, _) {
        var defaultTitle = _('app_name');
        $scope.$on('change_title', function(e, args) {
            $scope.title = args.title !== 'undefined' && args.title.length ? args.title : defaultTitle;
            console.log('Title change listener');
        });
    }])

    .controller('AppCtrl', ['$scope', function($scope) {
        console.log('Works!');
    }])

    .controller('IndexCtrl', ['$scope', '_', 'AudioPlaylists', 'AudioPlayer', function($scope, _, AudioPlaylists, AudioPlayer) {
        $scope.$emit('change_title', {
            title: _('app_name_raw')
        });

        $scope.openFiles = function(e) {
            var node = e.target,
                files = node.files;
            var firstFile = files[0];
            if (!firstFile) {
                return;
            }

            var reader = new FileReader();
            reader.addEventListener('load', function(fileEvent) {
                var arrayBuffer = fileEvent.target.result;
                var track = {
                    id: 'test',
                    name: 'Test',
                    artist: 'Test test',
                    duration: 201,
                    originalName: 'test.mp3',
                    photo: 'nope',
                    arrayBuffer: arrayBuffer,
                    audioBuffer: null
                };
                AudioPlayer.setTrack(track);
            });
            reader.readAsArrayBuffer(firstFile);
        };

        $scope.play = function() {
            AudioPlayer.play();
        };

        $scope.pause = function() {
            AudioPlayer.pause();
        };
    }])
;