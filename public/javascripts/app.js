
angular.module('uforia',
    ['ui.router', 'ui.bootstrap.modal', 'ui.bootstrap.datepicker', 'dndLists', 'ui', 'ui.select', 'smart-table', 'ngStorage'])

    .run(function($rootScope, $http, $state, $window) {
        $rootScope.mappings = {};
        socket = io.connect();
        socket.on('connect', function(){

        });
        socket.on('uforia', function(info){
            $rootScope.mappings[info.mapping] = info;
            $rootScope.$apply();
        });

        $rootScope.$on('$stateChangeStart', function(event, toState){

            $http.get('/logged-in')
                .success(function(user) {
                    // Authenticated 
                    if (user == 1) {
                        $rootScope.isLoggedIn = true;
                    } else {
                        $rootScope.isLoggedIn = false;
                    }
                });

            $rootScope.logout = function() {
                $http.post('/logout')
                    .success(function(data) {
                        delete $rootScope.user;
                        $window.location.reload();
                    });
            }

        });
    })
    .config(function($stateProvider, $urlRouterProvider, $sceProvider){
        // Disable Sce
        $sceProvider.enabled(false);
        //
        // For any unmatched url, redirect to /state1
        $urlRouterProvider.otherwise("/search");
        //
        // Now set up the states
        $stateProvider
            .state('search', {
                url: "/search",
                templateUrl: "views/search.html",
                controller: 'searchCtrl',
                resolve: {
                    types: model.getTypes
                }
            })
            .state('admin', {
                abstract: true,
                url: "/admin",
                template: '<ui-view/>',
                resolve: {
                    loggedin: isAuthenticated
                }
            })
            .state('admin.overview', {
                url: "",
                templateUrl: "views/admin.html",
                controller: 'adminCtrl',
                resolve: {
                    // modules: model.getAvailableModules,
                    types: model.getTypes,
                    loggedin: isAuthenticated
                }
            })
            .state('admin.mapping', {
                url: "/mapping/{type}",
                templateUrl: "views/mapping.html",
                controller: 'mappingCtrl',
                parent: 'admin',
                resolve: {
                    mime_types: model.getAvailableModules,
                    types: model.getTypes,
                    mapping: model.getMapping
                }
            })
            .state('login', {
                url: "/login",
                templateUrl: "views/authentication/login.html",
                controller: 'loginCtrl'
            })
            .state('user', {
                url: "/user",
                templateUrl: "views/userOverview.html",
                controller: 'userOverviewCtrl',
                resolve: {
                    role: isAdmin
                }
            });
    });


function isAuthenticated($q, $timeout, $http, $location, $rootScope) {
    // Initialize a new promise 
    var deferred = $q.defer();

    $http.get('/logged-in')
        .success(function(user) {
            // Authenticated 
            if (user == 1) {
                deferred.resolve();
            } else {
                $rootScope.message = 'You need to log in.';
                deferred.reject();
                $location.url('/login');
            }

            return deferred.promise;
        });
}

function isAdmin($q, $timeout, $http, $location, $rootScope) {
    var deferred = $q.defer();

    if($rootScope.user.role == 'Admin'){
        // User is admin
        deferred.resolve();
    }else{
        deferred.reject();
    }

    return deferred.promise;
}