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

    .directive('droppable', function() {
        //alert(1);
        return {
            link: function(scope, elem) {
                var el = elem[0];
                //el.draggable = true;
                el.addEventListener('dragover', function(e) {
                    //evt.stopPropagation();
                    if (e.preventDefault) e.preventDefault();
                    angular.element(el).addClass('droppable_over');

                    return false;
                }, false);

                el.addEventListener('dragleave', function(e) {
                    //evt.stopPropagation();
                    if (e.preventDefault) e.preventDefault();
                    angular.element(el).removeClass('droppable_over');

                    return false;
                }, false);

                el.addEventListener('dragenter', function(e) {
                    //evt.stopPropagation();
                    if (e.preventDefault) e.preventDefault();
                    angular.element(el).addClass('droppable_over');

                    return false;
                }, false);

                el.addEventListener('drop', function(e) {
                    //evt.stopPropagation();
                    if (e.preventDefault) e.preventDefault();

                    angular.element(el).removeClass('droppable_over');
                    console.log(e.dataTransfer);
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
    })
;