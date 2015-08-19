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