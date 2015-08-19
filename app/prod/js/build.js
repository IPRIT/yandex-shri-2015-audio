'use strict';

angular.module('Shri', [
    'ng',
    'ngRoute',
    'ngSanitize',
    'ngMaterial',
    'Shri.controllers',
    'Shri.services',
    'Shri.directives'
])
    .config(['$locationProvider', '$routeProvider', 'StorageProvider', function($locationProvider, $routeProvider, StorageProvider) {
        if (Config.Modes.test) {
            StorageProvider.setPrefix('t_');
        }
        $locationProvider.hashPrefix('!');

        $routeProvider
            .when('/', {
                templateUrl: templateUrl('index', 'main'),
                controller: 'IndexCtrl'
            })
            .otherwise({redirectTo: '/'});
    }]);
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
'use strict';

/* Directives */

angular.module('Shri.directives', [])

    .directive('mySubmitOnEnter', function () {
        return {
            link: link
        };
        function link($scope, element, attrs) {
            element.on('keydown', function (event) {
                if (event.keyCode == 13) {
                    element.trigger('submit');
                }
            });
        }
    })

    .directive('droppable', ['_', function(_) {
        //alert(1);
        return {
            link: function(scope, elem) {
                var el = elem[0];
                //el.draggable = true;
                var droppableElement = angular.element(el),
                    dropzoneMessage = droppableElement.find('.dropzone__message')[0];
                el.addEventListener('dragover', function(e) {
                    //evt.stopPropagation();
                    if (e.preventDefault) e.preventDefault();
                    angular.element(el).addClass('droppable_over');
                    dropzoneMessage.innerHTML = _('draggable_message_could_drop_raw');

                    return false;
                }, false);

                el.addEventListener('dragleave', function(e) {
                    //evt.stopPropagation();
                    if (e.preventDefault) e.preventDefault();
                    angular.element(el).removeClass('droppable_over');
                    dropzoneMessage.innerHTML = _('draggable_message_raw');

                    return false;
                }, false);

                el.addEventListener('dragenter', function(e) {
                    //evt.stopPropagation();
                    if (e.preventDefault) e.preventDefault();
                    angular.element(el).addClass('droppable_over');
                    dropzoneMessage.innerHTML = _('draggable_message_could_drop_raw');

                    return false;
                }, false);

                el.addEventListener('drop', function(e) {
                    //evt.stopPropagation();
                    if (e.preventDefault) e.preventDefault();

                    angular.element(el).removeClass('droppable_over');
                    dropzoneMessage.innerHTML = _('draggable_message_raw');

                    scope.openFiles(e.dataTransfer.files, true);

                    return false;
                }, false);

                el.addEventListener('click', function(e) {
                    var input = document.querySelector('#files_input');
                    input.click();
                    return false;
                }, false);
            }
        };
    }])
;

function initApplication () {
    ConfigStorage.get('i18n_locale', function (params) {
        var locale = params,
            defaultLocale = Config.I18n.locale,
            bootReady = {
                dom: false,
                i18n_ng: false,
                i18n_messages: false,
                i18n_fallback: false
            },
            checkReady = function checkReady () {
                var i, ready = true;
                for (i in bootReady) {
                    if (bootReady.hasOwnProperty(i) && bootReady[i] === false) {
                        ready = false;
                        break;
                    }
                }
                if (ready) {
                    bootReady.boot = false;
                    angular.bootstrap(document, ['Shri']);
                }
            };

        if (!locale) {
            locale = defaultLocale
        }
        for (var i = 0; i < Config.I18n.supported.length; i++) {
            if (Config.I18n.supported[i] == locale) {
                Config.I18n.locale = locale;
                break;
            }
        }
        bootReady.i18n_ng = true; //Config.I18n.locale == defaultLocale; // Already included

        $.getJSON('app/js/locales/' + Config.I18n.locale + '.json').success(function (json) {
            Config.I18n.messages = json;
            bootReady.i18n_messages = true;
            console.log('Locale language has been loaded');
            if (Config.I18n.locale == defaultLocale) { // No fallback, leave empty object
                bootReady.i18n_fallback = true;
            }
            checkReady();
        });

        if (Config.I18n.locale !== defaultLocale) {
            $.getJSON('/js/locales/' + defaultLocale + '.json').success(function (json) {
                Config.I18n.fallback_messages = json;
                bootReady.i18n_fallback = true;
                checkReady();
            });
        }

        $(document).ready(function() {
            bootReady.dom = true;
            if (!bootReady.i18n_ng) {
                $('<script>').appendTo('body')
                    .on('load', function() {
                        bootReady.i18n_ng = true;
                        checkReady();
                    })
            } else {
                checkReady();
            }
        });
    });
}
var Config = window.Config = window.Config || {};

Config.Modes = {
    test: location.search.indexOf('test=1') > 0,
    debug: location.search.indexOf('debug=1') > 0
};

Config.Navigator = {
    osX:  (navigator.platform || '').toLowerCase().indexOf('mac') != -1 ||
    (navigator.userAgent || '').toLowerCase().indexOf('mac') != -1,
    retina: window.devicePixelRatio > 1,
    ffos: navigator.userAgent.search(/mobi.+Gecko/i) != -1,
    touch: screen.width <= 768,
    opera: navigator.userAgent.search(/opr|opera/i) != -1,
    mobile: screen.width && screen.width < 480 || navigator.userAgent.search(/iOS|iPhone OS|Android|BlackBerry|BB10|Series ?[64]0|J2ME|MIDP|opera mini|opera mobi|mobi.+Gecko|Windows Phone/i) != -1
};

Config.I18n = {
    locale: 'ru-ru',
    supported: [
        'ru-ru'
    ],
    languages: {
        'ru-ru': 'Русский'
    },
    aliases: {
        'ru': 'ru-ru'
    },
    aliases_back: {
        'ru-ru': 'ru'
    },
    messages: {},
    fallback_messages: {}
};

(function (window) {
    var keyPrefix = '';
    var noPrefix = false;
    var cache = {};
    var useCs = false;
    var useLs = !useCs && !!window.localStorage;

    function storageSetPrefix (newPrefix) {
        keyPrefix = newPrefix;
    }

    function storageSetNoPrefix() {
        noPrefix = true;
    }

    function storageGetPrefix () {
        if (noPrefix) {
            noPrefix = false;
            return '';
        }
        return keyPrefix;
    }

    function storageGetValue() {
        var keys = Array.prototype.slice.call(arguments),
            callback = keys.pop(),
            result = [],
            single = keys.length == 1,
            value,
            allFound = true,
            prefix = storageGetPrefix(),
            i, key;

        for (i = 0; i < keys.length; i++) {
            key = keys[i] = prefix.toString() + keys[i];
            if (useLs) {
                try {
                    value = localStorage.getItem(key);
                } catch (e) {
                    useLs = false;
                }
                try {
                    value = (value === undefined || value === null) ?
                        false : JSON.parse(value);
                } catch (e) {
                    value = false;
                }
                result.push(cache[key] = value);
            }
            else if (!useCs) {
                result.push(cache[key] = false);
            }
            else {
                allFound = false;
            }
        }

        if (allFound) {
            return callback(single ? result[0] : result);
        }
    }

    function storageSetValue(obj, callback) {
        var keyValues = {},
            prefix = storageGetPrefix(),
            key, value;

        for (key in obj) {
            if (obj.hasOwnProperty(key)) {
                value = obj[key];
                key = prefix + key;
                cache[key] = value;
                value = JSON.stringify(value);
                if (useLs) {
                    try {
                        localStorage.setItem(key, value);
                    } catch (e) {
                        useLs = false;
                    }
                } else {
                    keyValues[key] = value;
                }
            }
        }

        if (useLs || !useCs) {
            if (callback) {
                callback();
            }
        }
    }

    function storageRemoveValue () {
        var keys = Array.prototype.slice.call(arguments),
            prefix = storageGetPrefix(),
            i, key, callback;

        if (typeof keys[keys.length - 1] === 'function') {
            callback = keys.pop();
        }

        for (i = 0; i < keys.length; i++) {
            key = keys[i] = prefix + keys[i];
            delete cache[key];
            if (useLs) {
                try {
                    localStorage.removeItem(key);
                } catch (e) {
                    useLs = false;
                }
            }
        }
        if (callback) {
            callback();
        }
    }

    window.ConfigStorage = {
        prefix: storageSetPrefix,
        noPrefix: storageSetNoPrefix,
        get: storageGetValue,
        set: storageSetValue,
        remove: storageRemoveValue
    }

})(window);

initApplication();
'use strict';

angular.module('Shri.i18n', [])
    .factory('_', ['$rootScope', '$locale', function($rootScope, $locale) {
        var locale = Config.I18n.locale;
        var messages = Config.I18n.messages;
        var fallbackMessages = Config.I18n.fallback_messages;
        var paramRegEx = /\{\s*([a-zA-Z\d\-_]+)(?:\s*:\s*(.*?))?\s*\}/g;

        function insertParams(msgstr, params) {
            return msgstr.replace(paramRegEx, function ($0, paramKey, nestedMsgStr) {
                var param = params[paramKey];
                if (param === undefined) {
                    console.warn('[i18n] missing param ' + paramKey + ' for message "' + msgstr + '"');
                    return '';
                }
                if (nestedMsgStr !== undefined) {
                    param = insertParams(param, nestedMsgStr.split('|'));
                }
                return param.toString().trim();
            });
        }

        function parseMarkdownString(msgstr, msgid) {
            msgstr = msgstr
                .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
                .replace(/\n|&#10;/g, "<br/>");

            return msgstr;
        }

        function _(msgid, params) {
            var raw = false;
            var msgstr = msgid;

            if (msgid.substr(-4) === '_raw') {
                raw = true;
                msgid = msgid.substr(0, msgid.length - 4);
            }

            if (messages.hasOwnProperty(msgid)) {
                msgstr = messages[msgid];
            } else if (fallbackMessages.hasOwnProperty(msgid)) {
                msgstr = fallbackMessages[msgid];
                console.warn('[i18n] missing locale key ' + locale + ' / ' + msgid);
            } else {
                console.warn('[i18n] missing key ' + msgid);
                return msgid;
            }

            if (!raw) {
                msgstr = encodeEntities(msgstr);
            }
            if (msgid.substr(-3) == '_md') {
                msgstr = parseMarkdownString(msgstr);
            }

            if (arguments.length > 1) {
                if (typeof params == 'string') {
                    Array.prototype.shift.apply(arguments);
                    msgstr = insertParams(msgstr, arguments);
                } else {
                    msgstr = insertParams(msgstr, params);
                }
            }

            return msgstr;
        }

        _.locale = function () {
            return locale;
        };

        _.pluralize = function (msgid) {
            var categories = $rootScope.$eval(_(msgid + '_raw'));
            return function (count) {
                return (categories[$locale.pluralCat(count)] || '').replace('{}', count);
            }
        };

        return _;
    }])

    .filter('i18n', ['_', function(_) {
        return function (msgid, params) {
            return _(msgid + '_raw', params);
        }
    }])

    .directive('ngPluralize', ['_', function(_) {
        return {
            restrict: 'EA',
            priority: 1,
            compile: function(element) {
                var msgid = element.attr('when');
                var msgstr = _(msgid + '_raw');
                element.attr('when', msgstr);
            }
        }
    }])

    .directive('shriI18n', ['_', function(_) {
        return {
            restrict: 'EA',
            compile: function(element) {
                var params = element.children('shri-i18n-param:not([name]), [shri-i18n-param=""]:not([name])').map(function(index, param) {
                    return param.outerHTML;
                }).toArray();
                element.children('shri-i18n-param[name], [shri-i18n-param]:not([shri-i18n-param=""]), [shri-i18n-param][name]').each(function(i, param) {
                    params[angular.element(param).attr('shri-i18n-param') || angular.element(param).attr('name')] = param.outerHTML;
                });
                element.children('shri-i18n-param').remove();
                var formats = element.attr("shri-i18n") || element.attr("msgid") ? element : element.children('shri-i18n-format, [shri-i18n-format]');
                formats.each(function(index, element) {
                    var format = angular.element(element);
                    var msgid = format.attr("shri-i18n") || format.attr("msgid") || format.attr("shri-i18n-format") || format.html().replace(/\s+/g, ' ').trim();
                    var msgstr = _(msgid, params);
                    format.html(msgstr);
                });
            }
        }
    }]);
// Console-polyfill. MIT license.
// https://github.com/paulmillr/console-polyfill
// Make it safe to do console.log() always.
(function (con) {
    'use strict';
    var prop, method;
    var empty = {};
    var dummy = function() {};
    var properties = 'memory'.split(',');
    var methods = ('assert,count,debug,dir,dirxml,error,exception,group,' +
    'groupCollapsed,groupEnd,info,log,markTimeline,profile,profileEnd,' +
    'time,timeEnd,trace,warn').split(',');
    while (prop = properties.pop()) con[prop] = con[prop] || empty;
    while (method = methods.pop()) con[method] = con[method] || dummy;
})(this.console = this.console || {});


/* Array.indexOf polyfill */
if (!Array.prototype.indexOf) {
    Array.prototype.indexOf = function(searchElement, fromIndex) {
        var k;
        if (this == null) {
            throw new TypeError('"this" is null or not defined');
        }

        var O = Object(this);
        var len = O.length >>> 0;
        if (len === 0) {
            return -1;
        }
        var n = +fromIndex || 0;

        if (Math.abs(n) === Infinity) {
            n = 0;
        }
        if (n >= len) {
            return -1;
        }
        k = Math.max(n >= 0 ? n : len - Math.abs(n), 0);
        while (k < len) {
            if (k in O && O[k] === searchElement) {
                return k;
            }
            k++;
        }
        return -1;
    };
}

/* Array.isArray polyfill */
if (!Array.isArray) {
    Array.isArray = function(arg) {
        return Object.prototype.toString.call(arg) === '[object Array]';
    };
}

/* Object.create polyfill */
if (typeof Object.create != 'function') {
    Object.create = (function() {
        var Object = function() {};
        return function (prototype) {
            if (arguments.length > 1) {
                throw Error('Second argument not supported');
            }
            if (typeof prototype != 'object') {
                throw TypeError('Argument must be an object');
            }
            Object.prototype = prototype;
            var result = new Object();
            Object.prototype = null;
            return result;
        };
    })();
}

/* Function.bind polyfill */
if (!Function.prototype.bind) {
    Function.prototype.bind = function (oThis) {
        if (typeof this !== "function") {
            throw new TypeError("Function.prototype.bind - what is trying to be bound is not callable");
        }
        var aArgs = Array.prototype.slice.call(arguments, 1),
            fToBind = this,
            fNOP = function () {},
            fBound = function () {
                return fToBind.apply(this instanceof fNOP && oThis
                        ? this
                        : oThis,
                    aArgs.concat(Array.prototype.slice.call(arguments)));
            };
        fNOP.prototype = this.prototype;
        fBound.prototype = new fNOP();

        return fBound;
    };
}

/* setZeroTimeout polyfill, from http://dbaron.org/log/20100309-faster-timeouts */
(function(global) {
    var timeouts = [];
    var messageName = 'zero-timeout-message';

    function setZeroTimeout(fn) {
        timeouts.push(fn);
        global.postMessage(messageName, '*');
    }

    function handleMessage(event) {
        if (event.source == global && event.data == messageName) {
            event.stopPropagation();
            if (timeouts.length > 0) {
                var fn = timeouts.shift();
                fn();
            }
        }
    }

    global.addEventListener('message', handleMessage, true);

    var originalSetTimeout = global.setTimeout;
    global.setTimeout = function (callback, delay) {
        if (!delay || delay <= 5) {
            return setZeroTimeout(callback);
        }
        return originalSetTimeout(callback, delay);
    };

    global.setZeroTimeout = setZeroTimeout;
})(this);
function cancelEvent (event) {
    event = event || window.event;
    if (event) {
        event = event.originalEvent || event;
        if (event.stopPropagation) event.stopPropagation();
        if (event.preventDefault) event.preventDefault();
    }

    return false;
}

function onCtrlEnter (textarea, cb) {
    $(textarea).on('keydown', function (e) {
        if (e.keyCode == 13 && (e.ctrlKey || e.metaKey)) {
            cb();
            return cancelEvent(e);
        }
    });
}

function safeReplaceObject (wasObject, newObject) {
    for (var key in wasObject) {
        if (!newObject.hasOwnProperty(key) && key.charAt(0) != '$') {
            delete wasObject[key];
        }
    }
    for (var key in newObject) {
        if (newObject.hasOwnProperty(key)) {
            wasObject[key] = newObject[key];
        }
    }
}

function listMergeSorted (list1, list2) {
    list1 = list1 || [];
    list2 = list2 || [];

    var result = angular.copy(list1);

    var minID = list1.length ? list1[list1.length - 1] : 0xFFFFFFFF;
    for (var i = 0; i < list2.length; i++) {
        if (list2[i] < minID) {
            result.push(list2[i]);
        }
    }

    return result;
}

function listUniqSorted (list) {
    list = list || [];
    var resultList = [],
        prev = false;
    for (var i = 0; i < list.length; i++) {
        if (list[i] !== prev) {
            resultList.push(list[i])
        }
        prev = list[i];
    }

    return resultList;
}

function templateUrl (prefix, tplName) {
    var templateUrlPart = 'app/partials/' + prefix + '/' + tplName + '.html';
    console.log(templateUrlPart);
    return templateUrlPart;
}

function encodeEntities(value) {
    return value.
        replace(/&/g, '&amp;').
        replace(/([^\#-~| |!])/g, function (value) { // non-alphanumeric
            return '&#' + value.charCodeAt(0) + ';';
        }).
        replace(/</g, '&lt;').
        replace(/>/g, '&gt;');
}

/**
 * @see https://gist.github.com/jonleighton/958841
 */
function base64ArrayBuffer(arrayBuffer) {
    var base64    = '';
    var encodings = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

    var bytes         = new Uint8Array(arrayBuffer);
    var byteLength    = bytes.byteLength;
    var byteRemainder = byteLength % 3;
    var mainLength    = byteLength - byteRemainder;

    var a, b, c, d;
    var chunk;

    // Main loop deals with bytes in chunks of 3
    for (var i = 0; i < mainLength; i = i + 3) {
        // Combine the three bytes into a single integer
        chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];

        // Use bitmasks to extract 6-bit segments from the triplet
        a = (chunk & 16515072) >> 18; // 16515072 = (2^6 - 1) << 18
        b = (chunk & 258048)   >> 12; // 258048   = (2^6 - 1) << 12
        c = (chunk & 4032)     >>  6; // 4032     = (2^6 - 1) << 6
        d = chunk & 63;               // 63       = 2^6 - 1

        // Convert the raw binary segments to the appropriate ASCII encoding
        base64 += encodings[a] + encodings[b] + encodings[c] + encodings[d]
    }

    // Deal with the remaining bytes and padding
    if (byteRemainder == 1) {
        chunk = bytes[mainLength];

        a = (chunk & 252) >> 2; // 252 = (2^6 - 1) << 2

        // Set the 4 least significant bits to zero
        b = (chunk & 3)   << 4; // 3   = 2^2 - 1

        base64 += encodings[a] + encodings[b] + '=='
    } else if (byteRemainder == 2) {
        chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1];

        a = (chunk & 64512) >> 10; // 64512 = (2^6 - 1) << 10
        b = (chunk & 1008)  >>  4; // 1008  = (2^6 - 1) << 4

        // Set the 2 least significant bits to zero
        c = (chunk & 15)    <<  2; // 15    = 2^4 - 1

        base64 += encodings[a] + encodings[b] + encodings[c] + '='
    }

    return base64
}

function arrayBufferToBase64Data(arrayBuffer, mime) {
    mime = mime || '';
    var prefix = 'data:' + mime + ';base64,';
    if (typeof arrayBuffer === 'object') {
        return prefix + base64ArrayBuffer(arrayBuffer);
    }
    return prefix;
}
var Waveform = (function() {
  function Waveform(options) {
    this.container = options.container;
    this.canvas = options.canvas;
    this.data = options.data || [];
    this.outerColor = options.outerColor || "transparent";
    this.innerColor = options.innerColor || "#000000";

    this.interpolate = options.interpolate !== false;
    if (this.canvas == null) {
      if (this.container) {
        this.canvas = this.createCanvas(this.container, options.width || this.container.clientWidth, options.height || this.container.clientHeight);
      } else {
        throw "Either canvas or container option must be passed";
      }
    }
    this.patchCanvasForIE(this.canvas);
    this.context = this.canvas.getContext("2d");
    this.width = parseInt(this.context.canvas.offsetWidth, 10);
    this.height = parseInt(this.context.canvas.offsetHeight, 10);
    if (options.data) {
      this.setData(options.data);
    }
    this.redraw();
  }

  Waveform.prototype.setData = function(data) {
    return this.data = data;
  };

  Waveform.prototype.setDataInterpolated = function(data) {
    return this.setData(this.interpolateArray(data, this.context.canvas.offsetWidth));
  };

  Waveform.prototype.setDataCropped = function(data) {
    return this.setData(this.expandArray(data, this.context.canvas.offsetWidth));
  };

  var drawVisual = false;
  Waveform.prototype.update = function(options) {
    this.data = options.data;
  };

  Waveform.prototype.redraw = function() {
    var $this = this;
    drawVisual = requestAnimationFrame($this.redraw.bind($this));
    var bufferLength = 256;
    this.context.fillStyle = 'white';
    this.context.fillRect(0, 0, this.context.canvas.offsetWidth, this.context.canvas.offsetHeight);

    var barWidth = (this.context.canvas.offsetWidth / bufferLength) * 2.5;
    var barHeight;
    var x = -100;

    for (var i = 0; i < bufferLength; i++) {
      barHeight = this.data[i] / 2.0;

      this.context.fillStyle = '#989898';
      this.context.fillRect(x,this.context.canvas.offsetHeight-barHeight/2,barWidth,barHeight/2);

      x += barWidth + 1;
    }
  };

  Waveform.prototype.clear = function() {
    this.context.fillStyle = this.outerColor;
    this.context.clearRect(0, 0, this.context.canvas.offsetWidth, this.context.canvas.offsetHeight);
    return this.context.fillRect(0, 0, this.context.canvas.offsetWidth, this.context.canvas.offsetHeight);
  };

  Waveform.prototype.patchCanvasForIE = function(canvas) {
    var oldGetContext;
    if (typeof window.G_vmlCanvasManager !== "undefined") {
      canvas = window.G_vmlCanvasManager.initElement(canvas);
      oldGetContext = canvas.getContext;
      return canvas.getContext = function(a) {
        var ctx;
        ctx = oldGetContext.apply(canvas, arguments);
        canvas.getContext = oldGetContext;
        return ctx;
      };
    }
  };

  Waveform.prototype.createCanvas = function(container, width, height) {
    var canvas;
    canvas = document.createElement("canvas");
    container.appendChild(canvas);
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    return canvas;
  };

  Waveform.prototype.expandArray = function(data, limit, defaultValue) {
    var i, newData, _i, _ref;
    if (defaultValue == null) {
      defaultValue = 0.0;
    }
    newData = [];
    if (data.length > limit) {
      newData = data.slice(data.length - limit, data.length);
    } else {
      for (i = _i = 0, _ref = limit - 1; 0 <= _ref ? _i <= _ref : _i >= _ref; i = 0 <= _ref ? ++_i : --_i) {
        newData[i] = data[i] || defaultValue;
      }
    }
    return newData;
  };

  Waveform.prototype.linearInterpolate = function(before, after, atPoint) {
    return before + (after - before) * atPoint;
  };

  Waveform.prototype.interpolateArray = function(data, fitCount) {
    var after, atPoint, before, i, newData, springFactor, tmp;
    newData = new Array();
    springFactor = new Number((data.length - 1) / (fitCount - 1));
    newData[0] = data[0];
    i = 1;
    while (i < fitCount - 1) {
      tmp = i * springFactor;
      before = new Number(Math.floor(tmp)).toFixed();
      after = new Number(Math.ceil(tmp)).toFixed();
      atPoint = tmp - before;
      newData[i] = this.linearInterpolate(data[before], data[after], atPoint);
      i++;
    }
    newData[fitCount - 1] = data[data.length - 1];
    return newData;
  };

  return Waveform;
})();
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
                if (!inited || visualizerFallback === angular.noop || curPlayerState === 'stopped') {
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
                gainNode.gain.value = settings.curVolume;
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
            gainNode.gain.value = settings.curVolume;
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
            return curOffsetTime + audioContext.currentTime - startOffsetTime;
        }

        function setOffsetTime(offsetTime) {
            pause(true);
            curOffsetTime = offsetTime;
            play(true);
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
            setOffsetTime: setOffsetTime,
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
            var startTime = new Date().getTime();
            var artist, name, photo;
            try {
                id3(file, function(err, tags) {
                    console.log(tags);
                    if (tags) {
                        artist = tags.artist;
                        name = tags.title;
                        if (tags.v2 && tags.v2.image && tags.v2.image.data) {
                            photo = {
                                base64: arrayBufferToBase64Data(tags.v2.image.data, tags.v2.image.mime)
                            }
                        }
                    }
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
                        name: name || file.name || 'Unnamed audio',
                        artist: artist || _('unknown_artist_raw'),
                        duration: 0,
                        originalName: file.name,
                        photo: photo,
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
