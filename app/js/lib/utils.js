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