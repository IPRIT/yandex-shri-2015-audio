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

    .service('AudioPlayer', ['Storage', '$q', '$mdDialog', '_', '$rootScope', function(Storage, $q, $mdDialog, _, $rootScope) {
        //source -> filter -> analyser -> gain -> dest
        var audioContext,
            sourceNode,
            filterNodes,
            analyserNode,
            gainNode,

            curTrack,

            inited = false,
            settings = {},

            visualizerFallback = angular.noop,
            visualizerTimer,
            defaultVisualizerTimeout = 30,

            curPlayerState = 'stopped',
            fileLoading = false,
            trackChanging = false,

            fadeInterval,
            fadeTimeout = 30,

            curOffsetTime = 0,
            startOffsetTime,

            operaNitificationShowed = false,

            decodeQueue = [],
            curDecodingAudio = 0,
            simultaneousDecodingLimit = 5,
            curDecodedTracks = 0,
            decodingLimitTracks = 10;

        (function init() {
            if (inited) {
                return;
            }
            audioContext = new (window.AudioContext || window.webkitAudioContext)();

            sourceNode = audioContext.createBufferSource();
            sourceNode.onended = onBufferEnded;

            gainNode = audioContext.createGain();

            analyserNode = audioContext.createAnalyser();
            analyserNode.fftSize = 256;
            var fFrequencyData = new Uint8Array(analyserNode.frequencyBinCount);
            visualizerTimer = setInterval(function() {
                if ((!inited || visualizerFallback === angular.noop) || curPlayerState === 'stopped') {
                    return;
                }
                if (curPlayerState === 'stopped') {
                    fFrequencyData = new Uint8Array(analyserNode.frequencyBinCount);
                } else {
                    analyserNode.getByteFrequencyData(fFrequencyData);
                }
                visualizerFallback(fFrequencyData);
            }, defaultVisualizerTimeout);

            sourceNode.connect(analyserNode);
            analyserNode.connect(gainNode);
            gainNode.connect(audioContext.destination);

            getSettings().then(function() {
                gainNode.gain.value = settings.curVolume || 1;
                sourceNode.loop = !!settings.loop;
                applyFilter(settings.filter || 'normal');
                inited = true;
                console.log('Audio Service has been initialized.');
            });

            if (Config.Navigator.opera && !operaNitificationShowed) {
                $mdDialog.show(
                    $mdDialog.alert()
                        .parent(angular.element(document.querySelector('.view')))
                        .clickOutsideToClose(true)
                        .title(_('warning_title_raw'))
                        .content(_('opera_error_raw'))
                        .ariaLabel('Alert Dialog')
                        .ok(_('try_force_raw'))
                );
                operaNitificationShowed = true;
            }
        })();

        function getSettings() {
            var deferred = $q.defer();
            Storage.get('audio_settings').then(function(audioSettings) {
                if (!audioSettings) {
                    settings = {
                        curVolume: 1.0,
                        loop: false,
                        filter: 'normal'
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
            if (trackChanging) {
                return;
            }
            var stopped = false;
            if (curPlayerState === 'playing') {
                pause(true);
                stopped = true;
            }
            trackChanging = true;
            switchTrack(curTrack, track, stopped, callback);
        }

        function switchTrack(prevTrack, newTrack, afterPlaying, callback) {
            var audioBuffer = newTrack.audioBuffer;
            if (!audioBuffer) {
                if (!newTrack.arrayBuffer) {
                    trackChanging = false;
                    afterPlaying && play(true);
                    if (callback) {
                        callback();
                    }
                    return;
                }

                fileLoading = true;
                newTrack.isDecoding = true;
                audioContext.decodeAudioData(newTrack.arrayBuffer, function(buffer) {
                    pause(true);

                    sourceNode.disconnect();
                    sourceNode = audioContext.createBufferSource();
                    sourceNode.onended = onBufferEnded;
                    sourceNode.buffer = buffer;
                    sourceNode.connect(filterNodes[0]);

                    newTrack.audioBuffer = buffer;
                    newTrack.arrayBuffer = null;
                    newTrack.isDecoding = false;

                    curTrack = newTrack;
                    curOffsetTime = 0;
                    trackChanging = false;
                    fileLoading = false;

                    if (afterPlaying) {
                        play(true);
                    }
                    if (callback) {
                        callback();
                    }
                }, function() {
                    if (Config.Navigator.opera) {
                        $mdDialog.show(
                            $mdDialog.alert()
                                .parent(angular.element(document.querySelector('.view')))
                                .clickOutsideToClose(true)
                                .title(_('file_not_found'))
                                .content(_('opera_error'))
                                .ariaLabel('Alert Dialog')
                                .ok(_('close_button_text_raw'))
                                .targetEvent(ev)
                        );
                    }
                });
            } else {
                sourceNode.disconnect();
                sourceNode = audioContext.createBufferSource();
                sourceNode.onended = onBufferEnded;
                sourceNode.buffer = newTrack.audioBuffer;
                sourceNode.connect(filterNodes[0]);

                curTrack = newTrack;
                curOffsetTime = 0;
                trackChanging = false;

                if (callback) {
                    callback();
                }
            }
        }

        function play(immediately) {
            if ((curPlayerState !== 'stopped' && !fadeInterval || !curTrack
                || fileLoading || trackChanging)) {
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
                if (trackChanging || fileLoading) {
                    return;
                }
                startOffsetTime = audioContext.currentTime;
                sourceNode.disconnect();
                sourceNode = audioContext.createBufferSource();
                sourceNode.onended = onBufferEnded;
                sourceNode.buffer = curTrack.audioBuffer;
                sourceNode.connect(filterNodes[0]);
                sourceNode.start(0, curOffsetTime);
                curPlayerState = 'playing';
                console.log('Audio Player: playing', curTrack);
            }
        }

        function pause(immediately) {
            if (curPlayerState !== 'playing' || !curTrack) {
                return;
            }

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

        function setFilter(filterName) {
            settings.filter = filterName;
            saveSettings();
            applyFilter(filterName);
        }

        function toggleLoop(force) {
            settings.loop = force || !settings.loop;
            saveSettings();
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

        function getAvailableFilters() {
            return {
                classic: [
                    {f: 60, Q: 1, gain: 0, type: 'peaking'}, {f: 170, Q: 1, gain: 0, type: 'peaking'},
                    {f: 310, Q: 1, gain: 0, type: 'peaking'}, {f: 600, Q: 1, gain: 0, type: 'peaking'},
                    {f: 1000, Q: 1, gain: 0, type: 'peaking'}, {f: 3000, Q: 1, gain: 0, type: 'peaking'},
                    {f: 6000, Q: 1, gain: -4, type: 'peaking'}, {f: 12000, Q: 1, gain: -4, type: 'peaking'},
                    {f: 14000, Q: 1, gain: -4, type: 'peaking'}, {f: 16000, Q: 1, gain: -4, type: 'peaking'}
                ],
                pop: [
                    {f: 60, Q: 1, gain: 0, type: 'peaking'}, {f: 170, Q: 1, gain: 2, type: 'peaking'},
                    {f: 310, Q: 1, gain: 4, type: 'peaking'}, {f: 600, Q: 1, gain: 5, type: 'peaking'},
                    {f: 1000, Q: 1, gain: 3, type: 'peaking'}, {f: 3000, Q: 1, gain: 0, type: 'peaking'},
                    {f: 6000, Q: 1, gain: 0, type: 'peaking'}, {f: 12000, Q: 1, gain: 0, type: 'peaking'},
                    {f: 14000, Q: 1, gain: 1, type: 'peaking'}, {f: 16000, Q: 1, gain: 0, type: 'peaking'}
                ],
                rock: [
                    {f: 60, Q: 1, gain: 4, type: 'peaking'}, {f: 170, Q: 1, gain: 2, type: 'peaking'},
                    {f: 310, Q: 1, gain: -2, type: 'peaking'}, {f: 600, Q: 1, gain: -5, type: 'peaking'},
                    {f: 1000, Q: 1, gain: -1, type: 'peaking'}, {f: 3000, Q: 1, gain: 2, type: 'peaking'},
                    {f: 6000, Q: 1, gain: 4, type: 'peaking'}, {f: 12000, Q: 1, gain: 6, type: 'peaking'},
                    {f: 14000, Q: 1, gain: 6, type: 'peaking'}, {f: 16000, Q: 1, gain: 5.8, type: 'peaking'}
                ],
                jazz: [
                    {f: 60, Q: 1, gain: 2, type: 'peaking'}, {f: 170, Q: 1, gain: 0, type: 'peaking'},
                    {f: 310, Q: 1, gain: -1, type: 'peaking'}, {f: 600, Q: 1, gain: -1, type: 'peaking'},
                    {f: 1000, Q: 1, gain: 0, type: 'peaking'}, {f: 3000, Q: 1, gain: 2, type: 'peaking'},
                    {f: 6000, Q: 1, gain: 4, type: 'peaking'}, {f: 12000, Q: 1, gain: 5, type: 'peaking'},
                    {f: 14000, Q: 1, gain: 6, type: 'peaking'}, {f: 16000, Q: 1, gain: 7, type: 'peaking'}
                ],
                normal: [
                    {f: 60, Q: 1, gain: 0, type: 'peaking'}, {f: 170, Q: 1, gain: 0, type: 'peaking'},
                    {f: 310, Q: 1, gain: 0, type: 'peaking'}, {f: 600, Q: 1, gain: 0, type: 'peaking'},
                    {f: 1000, Q: 1, gain: 0, type: 'peaking'}, {f: 3000, Q: 1, gain: 0, type: 'peaking'},
                    {f: 6000, Q: 1, gain: 0, type: 'peaking'}, {f: 12000, Q: 1, gain: 0, type: 'peaking'},
                    {f: 14000, Q: 1, gain: 0, type: 'peaking'}, {f: 16000, Q: 1, gain: 0, type: 'peaking'}
                ]
            };
        }

        function applyFilter(filter) {
            var selectedFilter = getAvailableFilters()[filter];
            if (!Array.isArray(selectedFilter)) {
                return;
            }

            function createFilter(filterParticle) {
                var filter = audioContext.createBiquadFilter();
                filter.type = filterParticle.type;
                filter.frequency.value = filterParticle.f;
                filter.frequency.Q = filterParticle.Q;
                filter.gain.value = filterParticle.gain;
                return filter;
            }

            var filters = selectedFilter.map(createFilter);
            filters.reduce(function(prevNode, curNode) {
                prevNode.connect(curNode);
                return curNode;
            });

            filterNodes = filters;
            sourceNode.disconnect();
            sourceNode.connect(filterNodes[0]);
            filterNodes[filterNodes.length - 1].connect(analyserNode);
        }

        function onBufferEnded() {
            $rootScope.$broadcast('track_ended', {
                track: curTrack
            });
        }

        function fillAudioBuffer(track) {
            if (!track) {
                return;
            }
            var deferred = $q.defer(),
                decodeItem = {
                    promise: deferred,
                    onLoaded: function() {
                        this.promise.resolve(this.track);
                    },
                    track: track
                };
            if (curDecodingAudio >= simultaneousDecodingLimit) {
                decodeQueue.push(decodeItem);
            } else {
                curDecodingAudio++;
                decodeAudio(decodeItem);
            }
            return deferred.promise;
        }

        function decodeAudio(decodeItem) {
            decodeItem.track.isDecoding = true;
            console.log('Start decoding track', decodeItem.track);

            curDecodedTracks++;
            audioContext.decodeAudioData(decodeItem.track.arrayBuffer, function(buffer) {
                if (!decodeItem.track) {
                    curDecodingAudio--;
                    return;
                }
                if (!decodeItem.track.audioBuffer) {
                    decodeItem.track.audioBuffer = buffer;
                }
                decodeItem.track.arrayBuffer = null;
                decodeItem.track.isDecoding = false;
                decodeItem.onLoaded();

                if (decodeQueue.length && curDecodedTracks < decodingLimitTracks) {
                    setTimeout(function() {
                        decodeAudio(decodeQueue.shift());
                    }, 500);
                } else {
                    curDecodingAudio--;
                }
            });
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
            getCurPlayerState: getCurPlayerState,
            getAvailableFilters: getAvailableFilters,
            setFilter: setFilter,
            fillAudioBuffer: fillAudioBuffer
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
                        audioBuffer: null,
                        isDecoding: false
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
                            .ariaLabel('Alert Dialog')
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
                            .ariaLabel('Alert Dialog')
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
                            .ariaLabel('Alert Dialog')
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
