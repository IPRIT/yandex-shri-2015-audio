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

    .service('AudioPlayer', ['Storage', '$q', function(Storage, $q) {
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

            fadeTimeout,

            firstStart = true;

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
                    fFrequencyData[i] /= 250;
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
            if (curPlayerState === 'playing') {
                pause();
                stopped = true;
            }
            switchTrack(curTrack, track, stopped, callback);
        }

        function switchTrack(prevTrack, newTrack, afterPlaying, callback) {
            var audioBuffer = newTrack.audioBuffer;
            if (!audioBuffer) {
                if (!newTrack.arrayBuffer) {
                    afterPlaying && play();
                    if (callback) {
                        callback();
                    }
                    return;
                }
                fileLoading = true;
                audioContext.decodeAudioData(newTrack.arrayBuffer, function(buffer) {
                    fileLoading = false;
                    sourceNode = audioContext.createBufferSource();
                    sourceNode.buffer = buffer;
                    sourceNode.connect(biquadfilterNode);
                    firstStart = true;
                    newTrack.audioBuffer = buffer;
                    newTrack.arrayBuffer = null;
                    curTrack = newTrack;
                    if (afterPlaying) {
                        play();
                    }
                    if (callback) {
                        callback();
                    }
                });
            } else {
                sourceNode = audioContext.createBufferSource();
                sourceNode.buffer = newTrack.audioBuffer;
                sourceNode.connect(biquadfilterNode);
                firstStart = true;
                curTrack = newTrack;
                if (callback) {
                    callback();
                }
            }
        }

        function play() {
            if (curPlayerState !== 'stopped' || !curTrack) {
                return;
            }
            if (firstStart) {
                sourceNode.start(0);
                firstStart = false;
            } else {
                sourceNode.connect(biquadfilterNode);
            }
            curPlayerState = 'playing';
            console.log('Audio Player: playing', curTrack);
        }

        function pause() {
            if (curPlayerState === 'stopped' || !curTrack) {
                return;
            }
            sourceNode.disconnect();
            curPlayerState = 'stopped';
            console.log('Audio Player: paused', curTrack);
        }

        function canPlay() {
            return inited && curTrack && !fileLoading;
        }

        function curSettings() {
            return settings;
        }

        return {
            setAudioVisualisationFallback: setAudioVisualisationFallback,
            setTrack: changeTrack,
            play: play,
            pause: pause,
            canPlay: canPlay,
            getSettings: curSettings
        };
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
