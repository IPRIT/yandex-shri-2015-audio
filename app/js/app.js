'use strict';

angular.module('Shri', [
    'ng',
    'ngRoute',
    'ngSanitize',
    'Shri.controllers',
    'Shri.services'
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
            .when('/profile', {
                templateUrl: templateUrl('index', 'main'),
                controller: 'IndexCtrl'
            })
            .otherwise({redirectTo: '/'});
    }]);