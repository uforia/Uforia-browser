(function () {

    angular.module('uforia').config(config).run(run);


    function run($rootScope, $http, $state, ROLES, $window) {
        $rootScope.$state = $state;

        $rootScope.Utils = {
            keys: Object.keys
        }

        $rootScope.mappings = {};
        socket = io.connect();
        socket.on('connect', function () {

        });
        socket.on('uforia', function (info) {
            $rootScope.mappings[info.mapping] = info;
            $rootScope.$apply();
        });
        $rootScope.roles = ROLES;

        $rootScope.$on('$stateChangeStart', function (event, toState) {
            // Would print "Hello World!" when 'parent' is activated
            // Would print "Hello UI-Router!" when 'parent.child' is activated

            // Set global var for logged in state.

            $http.get('/logged-in')
                .success(function (user) {
                    // Authenticated 
                    if (user == 1) {
                        $rootScope.isLoggedIn = true;
                    } else {
                        $rootScope.isLoggedIn = false;
                    }
                });

            $rootScope.logout = function () {
                $http.post('/logout')
                    .success(function (data) {
                        // $state.go('search', {}, {reload: true});
                        $window.location.reload();
                    });
            }

        });
    }

    function config($stateProvider, $urlRouterProvider, $ocLazyLoadProvider, ROLES) {
        $urlRouterProvider.otherwise("/");

        $ocLazyLoadProvider.config({
            // Set to true if you want to see what and when is dynamically loaded
            debug: false
        });

        $stateProvider
            .state('index', {
                url: "/",
                templateUrl: "app/components/main/main.view.html",
                controller: "MainController",
                controllerAs: "mainCtrl"
            })
            .state('profile', {
                url: "/profile",
                templateUrl: "app/components/main/profile/profile.view.html",
                controller: "profileController",
                controllerAs: "profileCtrl",
                data: { pageTitle: "profile" },
                resolve: {
                    loggedin: isAuthenticated
                }
            })
            .state('search', {
                url: "/search",
                templateUrl: "app/components/search/search.view.html",
                controller: 'SearchController',
                data: { pageTitle: "Search" },
                resolve: {
                    types: search.getTypes,
                    loggedin: isAuthenticated
                }
            })
            .state('users', {
                url: "/users",
                templateUrl: "app/components/users/users.view.html",
                controller: 'UsersController',
                controllerAs: 'ctrl',
                data: { pageTitle: "User overview" },
                resolve: {
                    loggedin: isAuthenticated
                }
            })
            .state('users.create', {
                url: "/create",
                templateUrl: "app/components/users/create/create.view.html",
                controller: "UsersCreateController",
                controllerAs: 'ctrl',
                data: { pageTitle: "Create user" },
                resolve:{
                    loggedin: isAuthenticated,
                }
            })
            .state('users.edit', {
                url: "/edit/:userId",
                templateUrl: "app/components/users/edit/edit.view.html",
                controller: "UsersEditController",
                controllerAs: 'ctrl',
                data: { pageTitle: "Edit user" },
                resolve:{
                    loggedin: isAuthenticated
                }
            })
            .state('auth', {
                url: "/auth",
                template: "<div ui-view></div>",
                controller: "AuthController"
            })
            .state('auth.login', {
                url: "/login",
                templateUrl: "app/components/authentication/login/login.view.html",
                controller: 'AuthLoginController',
                controllerAs: 'ctrl',
                data: { pageTitle: "Login" }
            });
    }
})();


function isAuthenticated($q, $timeout, $http, $location, $rootScope, $state) {
    // Initialize a new promise 
    var deferred = $q.defer();

    $http.get('/logged-in')
        .success(function (user) {
            // Authenticated 
            if (user == 1) {
                $rootScope.isLoggedIn = true;
                deferred.resolve();
            } else {
                $rootScope.message = 'You need to log in.';
                deferred.reject();
                $rootScope.isLoggedIn = false;
                $state.go('auth.login');
            }

            return deferred.promise;
        });
}
function hasRoles(roles) {
    return function($q, $rootScope, ROLES) {
        var deferred = $q.defer();

        for (var i = 0; i < roles.length; i++) {
            //Resolve state if roles match with user roles
            if (roles[i] === ROLES.admin && $rootScope.user.role == ROLES.admin || roles[i] === ROLES.manager && $rootScope.user.role == ROLES.manager
                || roles[i] === ROLES.user && $rootScope.user.role == ROLES.user) {
                return deferred.resolve();
            }else{
                // No match, do not resolve state
                deferred.reject();
            }
        }
        return deferred.promise;
    }
}