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
            .when('/playlists', {
                templateUrl: templateUrl('index', 'main'),
                controller: 'IndexCtrl'
            })
            .otherwise({redirectTo: '/'});
    }]);