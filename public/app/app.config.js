(function() {

    angular.module('uforia').config(config).run(run);


    function run($rootScope, $http, $state, $window) {
        $rootScope.$state = $state;

        $rootScope.mappings = {};
        socket = io.connect();
        socket.on('connect', function() {

        });
        socket.on('uforia', function(info) {
            $rootScope.mappings[info.mapping] = info;
            $rootScope.$apply();
        });

        $rootScope.$on('$stateChangeStart', function(event, toState) {
            // Would print "Hello World!" when 'parent' is activated
            // Would print "Hello UI-Router!" when 'parent.child' is activated

            // Set global var for logged in state.

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
                        // $state.go('search', {}, {reload: true});
                        $window.location.reload();
                    });
            }

        });
    }

    function config($stateProvider, $urlRouterProvider, $ocLazyLoadProvider) {
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
            .state('users', {
                url: "/users",
                templateUrl: "app/components/users/users.view.html",
                controller: 'UsersController',
                controllerAs: 'ctrl',
                data: { pageTitle: "User overview" }
            })
            .state('users.create', {
                url: "/create",
                templateUrl: "app/components/users/create/create.view.html",
                controller: "UsersCreateController",
                controllerAs: 'ctrl',
                data: { pageTitle: "Create user" }
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