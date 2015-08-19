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

    .controller('IndexCtrl', [
        '$scope', '_', 'AudioPlaylists', 'AudioPlayer', 'AudioTracks', '$interval', '$timeout', '$mdDialog',
        function($scope, _, AudioPlaylists, AudioPlayer, AudioTracks, $interval, $timeout, $mdDialog) {

        $interval(function() {
            return $scope;
        }, 10);

        $scope.$emit('change_title', {
            title: _('app_name_raw')
        });

        $scope.tracks = [];
        $scope.loading = false;
        $scope.changing = false;
        $scope.playing = false;
        $scope.isOffsetDraggable = false;
        $scope.curTrack = null;
        $scope.curTrackTime = 0;
        $scope.curVolume = 0.5;
        $scope.curVolumePercent = 50;
        $scope.curState = 'stopped';
        $scope.curPanelState = 'hidden';
        $scope.trackIndex = 0;
        $scope.isLoop = false;

        $timeout(function() {
            $scope.isLoop = AudioPlayer.isLoop();
            $scope.curVolume = AudioPlayer.getSettings().curVolume;
            $scope.curVolumePercent = $scope.curVolume * 100;
        }, 100);

        $scope.$watch('curVolumePercent', function(val) {
            $scope.curVolume = val / 100.0;
            AudioPlayer.setVolume($scope.curVolume);
        });

        $scope.toggleLoop = function() {
            AudioPlayer.toggleLoop();
            $scope.isLoop = !$scope.isLoop;
        };

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
            if ($scope.changing) {
                return;
            }
            $scope.curPanelState = 'opened';
            if ($scope.curTrack && $scope.curTrack.id === track.id) {
                $scope.curState === 'playing'
                    ? $scope.pause() : $scope.play();
                return;
            }
            $scope.changing = true;
            $scope.playing = true;
            $scope.curTrack = track;
            $scope.curState = 'stopped';
            $scope.loading = true;

            for (var i = 0; i < $scope.tracks.length; ++i) {
                if ($scope.tracks[i].id === track.id) {
                    $scope.trackIndex = i;
                }
            }

            AudioPlayer.setTrack(track, function() {
                AudioPlayer.play();
                $scope.changing = false;
                $scope.curState = AudioPlayer.getCurPlayerState();
                $scope.loading = false;
                $scope.playing = true;
                $scope.$emit('change_title', {
                    title: track.artist + ' - ' + track.name
                });
            });
        };

        $scope.play = function() {
            $scope.curState = 'playing';
            AudioPlayer.play(true);
        };

        $scope.pause = function() {
            $scope.curState = 'stopped';
            console.log('paused');
            AudioPlayer.pause(true);
        };

        $scope.openEqualizer = function(ev) {
            $mdDialog.show({
                controller: 'EqualizerCtrl',
                templateUrl: templateUrl('modals', 'settings'),
                parent: angular.element(document.body),
                clickOutsideToClose: true
            })
        };

        $scope.deleteTrack = function(track, e) {
            console.log($scope.tracks);
            if ($scope.curTrack && $scope.curTrack.id === track.id) {
                AudioPlayer.pause(true);
                $scope.curTrack.audioBuffer = null;
                $scope.curTrack = null;
                $scope.curPanelState = 'closed';
                $scope.$emit('change_title', {
                    title: _('app_name_raw')
                });
            }
            for (var i = 0; i < $scope.tracks.length; ++i) {
                if ($scope.tracks[i].id === track.id) {
                    $scope.tracks.splice(i, 1);
                    break;
                }
            }
        };

        var startDragTime;
        $scope.setOffsetDraggableState = function(state) {
            startDragTime = new Date().getTime();
            $scope.isOffsetDraggable = state;
        };

        $scope.updateTrackOffset = function(ev, moveEvent) {
            if (!ev || !ev.offsetX || !$scope.curTrack) {
                return;
            }
            if (moveEvent && (!$scope.isOffsetDraggable
                || (new Date()).getTime() - startDragTime < 300)) {
                return;
            }
            startDragTime = new Date().getTime();
            var targetElement = ev.target;
            while (!angular.element(targetElement).hasClass('player__position')) {
                targetElement = targetElement.parentNode;
            }
            var width = targetElement.offsetWidth,
                percentOffset = (ev.offsetX - 1) * 1.0 / width;
            AudioPlayer.setOffsetTime($scope.curTrack.audioBuffer.duration * percentOffset);
        };

        $scope.toggleVolume = function() {
            if ($scope.curVolume) {
                $scope.previousVolume = $scope.curVolume;
            }
            $scope.curVolume = $scope.curVolume ?
                0 : $scope.previousVolume || 1;
            AudioPlayer.setVolume($scope.curVolume);
            $scope.curVolumePercent = $scope.curVolume * 100;
        };

        $scope.$on('track_ended', function(e, arg) {
            if (AudioPlayer.getOffsetTime() < $scope.curTrack.audioBuffer.duration - 1) {
                return;
            }
            $scope.curTrack = null;
            if ($scope.trackIndex >= $scope.tracks.length - 1
                && !AudioPlayer.isLoop()) {
                $scope.pause();
                return;
            }
            if (!AudioPlayer.isLoop()) {
                $scope.trackIndex++;
            }
            $timeout(function() {
                $scope.playTrack($scope.tracks[$scope.trackIndex]);
            }, 100);
        });

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

        $interval(function() {
            if (!$scope.curTrack || !$scope.curTrack.audioBuffer
                || $scope.curState === 'stopped') {
                return;
            }
            $scope.curTrackTime = AudioPlayer.getOffsetTime()
                / $scope.curTrack.audioBuffer.duration * 100;
        }, 20);
    }])

    .controller('EqualizerCtrl', ['$scope', '$mdDialog', 'AudioPlayer', '_',
        function($scope, $mdDialog, AudioPlayer, _) {

        var availableFilters = AudioPlayer.getAvailableFilters(),
            filters = [];
        for (var el in availableFilters) {
            filters.push({
                id: el,
                name: _('filter_' + el + '_raw')
            });
        }

        $scope.filters = filters;
        $scope.curFilter = AudioPlayer.getSettings().filter;

        $scope.save = function() {
            $mdDialog.hide();
        };

        $scope.closeWindow = function() {
            $mdDialog.hide();
        };

        $scope.selectFilter = function(filter) {
            $scope.curFilter = filter.id;
            AudioPlayer.setFilter(filter.id);
        };
    }])
;