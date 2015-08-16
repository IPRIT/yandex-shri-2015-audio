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
        $scope.curPanelState = 'hidden';

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
            if (!sList.length) {
                $scope.loading = false;
                return;
            }
            loadFile();
            $scope.loading = true;

            function loadFile() {
                if (!sList[index]) {
                    $scope.loading = false;
                    return;
                }
                AudioTracks.create(sList[index], function(progress) {
                    $scope.progress = progress;
                }, function(track) {
                    if (track && track.id) {
                        $scope.tracks.push(track);
                    }
                    index++;
                    loadFile();
                });
            }
        };

        $scope.playTrack = function(track, e) {
            $scope.curPanelState = 'opened';
            if ($scope.curTrack && $scope.curTrack.id === track.id) {
                $scope.curState === 'playing'
                    ? $scope.pause() : $scope.play();
                return;
            }
            $scope.playing = true;
            $scope.curTrack = track;
            $scope.curState = 'stopped';
            $scope.loading = true;

            AudioPlayer.setTrack(track, function() {
                AudioPlayer.play();
                $scope.curState = AudioPlayer.getCurPlayerState();
                $scope.loading = false;
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
            container: document.querySelector('.player__waveform'),
            innerColor: '#3F51B5'
        });

        $timeout(function() {
            AudioPlayer.setAudioVisualisationFallback(function(data) {
                waveform.update({
                    data: data
                });
            });
        }, 1000);
    }])
;