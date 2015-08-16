/* Services */

angular.module('Shri.services', [
    'Shri.i18n'
])
    .provider('Storage', function () {

        this.setPrefix = function (newPrefix) {
            ConfigStorage.prefix(newPrefix);
        };

        this.$get = ['$q', function ($q) {
            var methods = {};
            angular.forEach(['get', 'set', 'remove'], function (methodName) {
                methods[methodName] = function () {
                    var deferred = $q.defer(),
                        args = Array.prototype.slice.call(arguments);

                    args.push(function (result) {
                        deferred.resolve(result);
                    });
                    ConfigStorage[methodName].apply(ConfigStorage, args);

                    return deferred.promise;
                };
            });
            return methods;
        }];
    })

    .service('StorageObserver', ['Storage', function(Storage) {
        var Observer = function Observer(storageKey, callback, params) {
            params = params || {};
            var prevVal,
                looper,
                destroyFlag = params.destroy || false,
                lazyTimeout = params.timeout || 50,
                deleteAfter = params.deleteAfter || false;
            Storage.get(storageKey).then(function(value) {
                prevVal = value;
            });
            looper = setInterval(function() {
                Storage.get(storageKey).then(function(value) {
                    if (prevVal != value) {
                        callback(value, prevVal);
                        if (destroyFlag || deleteAfter) {
                            clearInterval(looper);
                            if (deleteAfter) {
                                Storage.remove(storageKey);
                            }
                        }
                        prevVal = value;
                    }
                });
            }, lazyTimeout);

            function stop(lastInvoke) {
                clearInterval(looper);
                if (lastInvoke) {
                    callback(prevVal);
                }
            }

            return {
                stopWatching: stop
            }
        };

        function startObserver() {
            var args = Array.prototype.slice.call(arguments);
            return Observer.apply(this, args);
        }

        return {
            watch: startObserver
        }
    }])

    .service('AudioPlaylists', ['Storage', '$q', function(Storage, $q) {
        var playlists,
            storagePlaylistsKeyName = 'audio_playlists',
            inited = false;

        return {
            create: createPlaylist,
            getById: getPlaylistById,
            getByName: getPlaylistsByName,
            getAll: getAllPlaylists,
            deleteById: deleteById,
            clearAll: clearPlaylists
        };

        function createPlaylist(name) {
            if (!inited) {
                return init().then(function() {
                    createPlaylist(name);
                });
            }
            var deferred = $q.defer(),
                playlistId = createUniqId();
            if (!name || typeof name !== 'string') {
                return deferred.reject();
            }
            playlists[playlistId] = {
                id: playlistId,
                name: name,
                tracks: [],
                timestamp: new Date().getTime()
            };
            Storage.set({ 'audio_playlists': playlists }).then(function() {
                deferred.resolve(playlistId);
            });
            return deferred.promise;
        }

        function createUniqId() {
            return (Math.random() * 1000).toString(16).replace('.', '_');
        }

        function init() {
            var deferred = $q.defer();
            if (inited) {
                return deferred.resolve();
            }
            Storage.get(storagePlaylistsKeyName).then(function(receivedPlaylists) {
                if (receivedPlaylists && angular.isObject(receivedPlaylists)) {
                    playlists = receivedPlaylists;
                    inited = true;
                    return deferred.resolve();
                }
                playlists = {};
                save().then(function() {
                    deferred.resolve();
                });
            });
            return deferred.promise;
        }

        function getPlaylistById(playlistId) {
            var deferred = $q.defer();
            if (!inited) {
                init().then(function() {
                    takePlaylist();
                });
                return deferred.promise;
            }
            takePlaylist();

            function takePlaylist() {
                if (!playlists[playlistId]) {
                    return deferred.resolve(null);
                }
                deferred.resolve(playlists[playlistId]);
            }
            return deferred.promise;
        }

        function getPlaylistsByName(playlistName) {
            var deferred = $q.defer();
            if (!inited) {
                init().then(function() {
                    takePlaylists();
                });
                return deferred.promise;
            }
            takePlaylists();

            function takePlaylists() {
                var playlistIds = Object.keys(playlists),
                    takenPlaylists = [];
                [].forEach.call(playlistIds, function(id) {
                    if (playlists[id].name === playlistName) {
                        takenPlaylists.push(playlists[id]);
                    }
                });
                deferred.resolve(
                    takenPlaylists.length ?
                        (takenPlaylists.length === 1 ? takenPlaylists[0] : takenPlaylists) : null
                );
            }
            return deferred.promise;
        }

        function deleteById(playlistId) {
            var deferred = $q.defer();
            if (!inited) {
                init().then(function() {
                    deletePlaylist();
                });
                return deferred.promise;
            }
            deletePlaylist();

            function deletePlaylist() {
                if (!playlists[playlistId]) {
                    return deferred.resolve(null);
                }
                var deletedPlaylist = playlists[playlistId];
                playlists[playlistId] = null;
                delete playlists[playlistId];
                save().then(function() {
                    deferred.resolve(deletedPlaylist);
                });
            }
            return deferred.promise;
        }

        function save() {
            var deferred = $q.defer();
            Storage.set({ 'audio_playlists': playlists }).then(function() {
                deferred.resolve();
            });
            return deferred.promise;
        }

        function clearPlaylists(returnPlaylists, asObject) {
            var deferred = $q.defer();
            if (!inited) {
                init().then(function() {
                    deleteAllPlaylists();
                });
                return deferred.promise;
            }
            deleteAllPlaylists();

            function deleteAllPlaylists() {
                var savedPlaylists = angular.copy(playlists);
                playlists = {};
                save().then(function() {
                    if (returnPlaylists) {
                        if (asObject) {
                            return deferred.resolve(savedPlaylists);
                        }
                        var playlistIds = Object.keys(savedPlaylists),
                            takenPlaylists = [];
                        [].forEach.call(playlistIds, function(id) {
                            takenPlaylists.push(savedPlaylists[id]);
                        });
                        return deferred.resolve(takenPlaylists);
                    }
                    deferred.resolve();
                });
            }
            return deferred.promise;
        }

        function getAllPlaylists(asObject) {
            var deferred = $q.defer();
            if (!inited) {
                init().then(function() {
                    takePlaylists();
                });
                return deferred.promise;
            }
            takePlaylists();

            function takePlaylists() {
                if (asObject) {
                    return deferred.resolve(playlists);
                }
                var playlistIds = Object.keys(playlists),
                    takenPlaylists = [];
                [].forEach.call(playlistIds, function(id) {
                    takenPlaylists.push(playlists[id]);
                });
                deferred.resolve(takenPlaylists);
            }
            return deferred.promise;
        }
    }])

    .service('AudioPlayer', ['Storage', '$q', '$mdDialog', '_', function(Storage, $q, $mdDialog, _) {
        //source -> biquadFilter -> analyser -> gain -> dest
        var audioContext,
            sourceNode,
            biquadfilterNode,
            analyserNode,
            gainNode,

            curTrack,

            inited = false,
            settings = {},

            visualizerFallback = angular.noop,
            visualizerTimer,
            defaultVisualizerTimeout = 50,

            curPlayerState = 'stopped',
            fileLoading = false,

            fadeInterval,
            fadeTimeout = 30,

            curOffsetTime = 0,
            startOffsetTime;

        (function init() {
            if (inited) {
                return;
            }
            audioContext = new (window.AudioContext || window.webkitAudioContext)();

            sourceNode = audioContext.createBufferSource();

            gainNode = audioContext.createGain();

            analyserNode = audioContext.createAnalyser();
            analyserNode.fftSize = 1024;
            var fFrequencyData = new Float32Array(analyserNode.fftSize);
            visualizerTimer = setInterval(function() {
                if (curPlayerState === 'stopped' || !inited
                    || visualizerFallback === angular.noop) {
                    return;
                }
                analyserNode.getFloatFrequencyData(fFrequencyData);
                for (var i = 0; i < fFrequencyData.length; ++i) {
                    fFrequencyData[i] /= 200;
                }
                visualizerFallback(fFrequencyData);
            }, defaultVisualizerTimeout);

            biquadfilterNode = audioContext.createBiquadFilter();
            biquadfilterNode.type = 'highpass';
            biquadfilterNode.frequency.value = 135;
            biquadfilterNode.frequency.Q = 2.81;

            sourceNode.connect(biquadfilterNode);
            biquadfilterNode.connect(analyserNode);
            analyserNode.connect(gainNode);
            gainNode.connect(audioContext.destination);

            getSettings().then(function() {
                gainNode.gain.value = settings.curVolume || 1;
                sourceNode.loop = settings.loop;
                inited = true;
                console.log('Audio Service has been initialized.');
            });
        })();

        function getSettings() {
            var deferred = $q.defer();
            Storage.get('audio_settings').then(function(audioSettings) {
                if (!audioSettings) {
                    settings = {
                        curVolume: 1.0,
                        loop: false
                    };
                    return saveSettings().then(function() {
                        deferred.resolve(settings);
                    });
                }
                deferred.resolve(settings = audioSettings);
            });
            return deferred.promise;
        }

        function saveSettings() {
            var deferred = $q.defer();
            Storage.set({ 'audio_settings': settings }).then(function() {
                deferred.resolve();
            });
            return deferred.promise;
        }

        function setAudioVisualisationFallback(fallback) {
            visualizerFallback = fallback;
        }

        function changeTrack(track, callback) {
            var stopped = false;
            console.log(curPlayerState);
            if (curPlayerState === 'playing') {
                pause(true);
                stopped = true;
            }
            switchTrack(curTrack, track, stopped, callback);
        }

        function switchTrack(prevTrack, newTrack, afterPlaying, callback) {
            var audioBuffer = newTrack.audioBuffer;
            if (!audioBuffer) {
                if (!newTrack.arrayBuffer) {
                    afterPlaying && play(true);
                    if (callback) {
                        callback();
                    }
                    return;
                }
                fileLoading = true;
                audioContext.decodeAudioData(newTrack.arrayBuffer, function(buffer) {
                    pause(true);
                    fileLoading = false;
                    sourceNode = audioContext.createBufferSource();
                    sourceNode.buffer = buffer;
                    sourceNode.connect(biquadfilterNode);
                    newTrack.audioBuffer = buffer;
                    newTrack.arrayBuffer = null;
                    curTrack = newTrack;
                    curOffsetTime = 0;

                    if (afterPlaying) {
                        play(true);
                    }
                    if (callback) {
                        callback();
                    }
                });
            } else {
                sourceNode = audioContext.createBufferSource();
                sourceNode.buffer = newTrack.audioBuffer;
                sourceNode.connect(biquadfilterNode);
                curTrack = newTrack;
                curOffsetTime = 0;

                if (callback) {
                    callback();
                }
            }
        }

        function play(immediately) {
            if (curPlayerState !== 'stopped' && !fadeInterval || !curTrack || fileLoading) {
                return;
            }

            if (immediately) {
                clearInterval(fadeInterval);
                return playFunc();
            }

            if (fadeInterval) {
                clearInterval(fadeInterval);
                fadeInterval = null;
            }
            playFunc();
            if (Math.abs(gainNode.gain.value - settings.curVolume) > -1e6) {
                var curGainValue = gainNode.gain.value;
                fadeInterval = setInterval(function() {
                    curGainValue += 0.05;
                    if (curGainValue >= settings.curVolume) {
                        gainNode.gain.value = settings.curVolume;
                        clearInterval(fadeInterval);
                        fadeInterval = null;
                        return;
                    }
                    gainNode.gain.value = curGainValue;
                }, fadeTimeout);
            }

            function playFunc() {
                startOffsetTime = audioContext.currentTime;
                sourceNode = audioContext.createBufferSource();
                sourceNode.buffer = curTrack.audioBuffer;
                sourceNode.connect(biquadfilterNode);
                sourceNode.start(0, curOffsetTime);
                curPlayerState = 'playing';
                console.log('Audio Player: playing', curTrack);
            }
        }

        function pause(immediately) {
            if (curPlayerState !== 'playing' || !curTrack) {
                return;
            }

            console.log('stop');
            if (immediately) {
                clearInterval(fadeInterval);
                return stopFunc();
            }

            if (fadeInterval) {
                clearInterval(fadeInterval);
                fadeInterval = null;
            }
            var curGainValue = gainNode.gain.value;
            fadeInterval = setInterval(function() {
                curGainValue -= 0.05;
                if (curGainValue <= 0) {
                    gainNode.gain.value = 0;
                    stopFunc();
                    clearInterval(fadeInterval);
                    fadeInterval = null;
                    return;
                }
                gainNode.gain.value = curGainValue;
            }, fadeTimeout);

            function stopFunc() {
                curOffsetTime += audioContext.currentTime - startOffsetTime;
                sourceNode.stop(0);
                sourceNode.disconnect();
                curPlayerState = 'stopped';
                console.log('Audio Player: paused', curTrack);
            }
        }

        function canPlay() {
            return inited && curTrack && !fileLoading;
        }

        function curSettings() {
            return settings;
        }

        function setAudioVolume(volume) {
            settings.curVolume = volume;
            saveSettings();
        }

        function toggleLoop(force) {
            settings.loop = force || !settings.loop;
        }

        function getOffsetTime() {
            return curOffsetTime;
        }

        function isLoop() {
            return settings.loop;
        }

        function getCurTrack() {
            return curTrack;
        }

        function getCurPlayerState() {
            return curPlayerState;
        }

        return {
            setAudioVisualisationFallback: setAudioVisualisationFallback,
            setTrack: changeTrack,
            play: play,
            pause: pause,
            canPlay: canPlay,
            getSettings: curSettings,
            setVolume: setAudioVolume,
            toggleLoop: toggleLoop,
            getOffsetTime: getOffsetTime,
            isLoop: isLoop,
            getCurTrack: getCurTrack,
            getCurPlayerState: getCurPlayerState
        };
    }])

    .service('AudioTracks', ['Storage', '$q', '_', '$mdDialog', function(Storage, $q, _, $mdDialog) {
        var tracks = Object.create(null);

        return {
            create: createTrack,
            add: addTrack,
            getAll: getAllTracks,
            getById: getTrackById,
            deleteById: deleteTrackById,
            deleteAll: deleteAllTracks
        };

        function createUniqId() {
            return (Math.random() * 1000).toString(16).replace('.', '_');
        }

        function createTrack(file, progressCallback, onReady) {
            var artist, name;
            try {
                id3(file, function(err, tags) {
                    artist = tags.artist;
                    name = tags.title;
                    proccessFile();
                });
            } catch (e) {
                console.log(e);
                proccessFile();
            }

            function proccessFile() {
                var reader = new FileReader();
                reader.onerror = errorFileReaderHandler;
                reader.onprogress = updateProgress.bind(this, progressCallback);
                reader.addEventListener('load', function(progressEvent) {
                    var arrayBuffer = progressEvent.target.result;
                    var track = {
                        id: createUniqId(),
                        name: name || file.name,
                        artist: artist || _('unknown_artist_raw'),
                        duration: 0,
                        originalName: file.name,
                        photo: 'nope',
                        arrayBuffer: arrayBuffer,
                        audioBuffer: null
                    };
                    onReady(track);
                });
                reader.readAsArrayBuffer(file);
            }
        }

        function errorFileReaderHandler(evt) {
            switch (evt.target.error.code) {
                case evt.target.error.NOT_FOUND_ERR:
                    $mdDialog.show(
                        $mdDialog.alert()
                            .parent(angular.element(document.querySelector('.view')))
                            .clickOutsideToClose(true)
                            .title(_('file_not_found_raw'))
                            .content(_('file_not_found_error_raw'))
                            .ariaLabel('Alert Dialog Demo')
                            .ok(_('close_button_text'))
                    );
                    break;
                case evt.target.error.NOT_READABLE_ERR:
                    $mdDialog.show(
                        $mdDialog.alert()
                            .parent(angular.element(document.querySelector('.view')))
                            .clickOutsideToClose(true)
                            .title(_('file_not_found_raw'))
                            .content(_('file_not_readable_error_raw'))
                            .ariaLabel('Alert Dialog Demo')
                            .ok(_('close_button_text_raw'))
                    );
                    break;
                case evt.target.error.ABORT_ERR:
                    break; // noop
                default:
                    $mdDialog.show(
                        $mdDialog.alert()
                            .parent(angular.element(document.querySelector('.view')))
                            .clickOutsideToClose(true)
                            .title(_('file_not_found_raw'))
                            .content(_('unknown_error_content_raw'))
                            .ariaLabel('Alert Dialog Demo')
                            .ok(_('close_button_text_raw'))
                    );
            }
        }

        function updateProgress(progressCallback, evt) {
            if (evt.lengthComputable) {
                progressCallback(Math.round((evt.loaded / evt.total) * 100));
            }
        }

        function addTrack(track) {
            if (tracks[track.id]) {
                return tracks[track.id];
            }
            tracks[track.id] = track;
        }

        function getAllTracks() {
            var retArr = [];
            for (var key in tracks) {
                retArr.push(tracks[key]);
            }
            return retArr;
        }

        function getTrackById(id) {
            if (typeof id === 'string' && tracks[id]) {
                return tracks[id];
            }
            return null;
        }

        function deleteTrackById(id) {
            if (typeof id === 'string' && tracks[id]) {
                tracks[id] = null;
                delete tracks[id];
            }
        }

        function deleteAllTracks() {
            tracks = Object.create(null);
        }
    }])
;



var AudioTrack = {
    id: String,
    name: String,
    artist: String,
    duration: 'Float',
    originalName: String,
    photo: String,
    arrayBuffer: 'ArrayBuffer',
    audioBuffer: 'AudioBuffer'
};
