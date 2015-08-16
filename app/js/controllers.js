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

    .controller('IndexCtrl', ['$scope', '_', 'AudioPlaylists', 'AudioPlayer', 'AudioTracks', function($scope, _, AudioPlaylists, AudioPlayer, AudioTracks) {
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
            AudioTracks.create(firstFile, function(num) {
                console.log(num + '%');
            }, function(track) {
                AudioTracks.add(track);
                AudioPlayer.setTrack(track, function() {
                    AudioPlayer.play();
                });
            })
        };

        $scope.play = function() {
            AudioPlayer.play();
        };

        $scope.pause = function() {
            AudioPlayer.pause();
        };

        $scope.handleDrop = function() {
            alert('Item has been dropped');
        }
    }])
;