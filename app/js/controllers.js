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

    .controller('AppCtrl', ['$scope', '$timeout', '$interval', function($scope, $timeout, $interval) {
        console.log('Works!');
    }])

    .controller('IndexCtrl', ['$scope', '_', 'AudioPlaylists', 'AudioPlayer', 'AudioTracks', '$interval', '$timeout', function($scope, _, AudioPlaylists, AudioPlayer, AudioTracks, $interval, $timeout) {
        $interval(function() {
            return $scope;
        }, 10);

        $scope.$emit('change_title', {
            title: _('app_name_raw')
        });

        $scope.tracks = [];
        $scope.loading = false;
        $scope.playing = false;
        $scope.curTrack = null;
        $scope.curState = 'stopped';

        $scope.openFiles = function(e, flag) {
            var node,
                files,
                index = 0;
            if (flag) {
                files = e;
            } else {
                node = e.target;
                files = node.files;
            }
            var sList = [];
            for (var i = 0; i < files.length; ++i) {
                if (files[i] && files[i].type.match(/audio\//i)) {
                    sList.push(files[i]);
                }
            }
            loadFile();
            $scope.loading = true;

            var loadedTracks = [];
            function loadFile() {
                if (!sList[index]) {
                    $scope.tracks = loadedTracks;
                    $scope.loading = false;
                    return;
                }
                AudioTracks.create(sList[index], function(progress) {
                    $scope.progress = progress;
                }, function(track) {
                    if (track && track.id) {
                        loadedTracks.push(track);
                    }
                    index++;
                    loadFile();
                });
            }
        };

        $scope.playTrack = function(track, e) {
            $scope.playing = true;
            $scope.curTrack = track;
            $scope.curState = 'stopped';
            AudioPlayer.setTrack(track, function() {
                AudioPlayer.play();
                $scope.curState = AudioPlayer.getCurPlayerState();
                $scope.playing = true;
            });
        };

        $scope.play = function() {
            $scope.curState = 'playing';
            AudioPlayer.play(true);
        };

        $scope.pause = function() {
            $scope.curState = 'stopped';
            AudioPlayer.pause(true);
        };

        var waveform = new Waveform({
            container: document.querySelector(".player__waveform"),
            innerColor: "#FE9EDB"
        });

        $timeout(function() {
            AudioPlayer.setAudioVisualisationFallback(function(data) {
                console.log()
                waveform.update({
                    data: data
                });
            });
        }, 1000);
    }])
;