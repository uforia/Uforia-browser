(function () {

    angular.module('uforia').config(config).run(run);


    function run($rootScope, $http, $state, ROLES, $window, $sessionStorage, $location) {
        $rootScope.$state = $state;

        if (typeof $rootScope.user == 'undefined') $rootScope.user = $sessionStorage.user;

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

        // For the menu and asigning active class to active menu items.
        $rootScope.getClass = function (path) {
            return ($location.path().substr(0, path.length) === path) ? 'active' : '';
        }


        // Put refreshUser function in the rootscope.
        $rootScope.refreshUser = function () {
            refreshUser($http, $sessionStorage, $rootScope);
        }
    }

    function config($stateProvider, $urlRouterProvider, $ocLazyLoadProvider, $sceProvider, ROLES) {
        $urlRouterProvider.otherwise("/index");

        // Disable Sce for ui-select plugin on mappings page
        $sceProvider.enabled(false);

        $ocLazyLoadProvider.config({
            // Set to true if you want to see what and when is dynamically loaded
            debug: false
        });

        $stateProvider
            .state('index', {
                url: "/index",
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
                    loggedin: isAuthenticated,
                    loggedInUser: getLoggedInUser,
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
                    loggedin: isAuthenticated,
                    isAllowed: hasRoles([ROLES.admin, ROLES.manager])
                }
            })
            .state('users.create', {
                url: "/create",
                templateUrl: "app/components/users/create/create.view.html",
                controller: "UsersCreateController",
                controllerAs: 'ctrl',
                data: { pageTitle: "Create user" },
                resolve: {
                    loggedin: isAuthenticated,
                    isAllowed: hasRoles([ROLES.admin, ROLES.manager])
                }
            })
            .state('users.edit', {
                url: "/edit/:userId",
                templateUrl: "app/components/users/edit/edit.view.html",
                controller: "UsersEditController",
                controllerAs: 'ctrl',
                data: { pageTitle: "Edit user" },
                resolve: {
                    loggedin: isAuthenticated,
                    isAllowed: hasRoles([ROLES.admin, ROLES.manager])
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
            })
            .state('mappings', {
                url: "/mappings",
                templateUrl: "app/components/mappings/mappings.view.html",
                controller: 'MappingsController',
                controllerAs: 'ctrl',
                data: { pageTitle: "Mapping overview" },
                resolve: {
                    loggedin: isAuthenticated,
                    types: mappings.getTypes
                }
            })
            .state('mappings.create', {
                url: "/create",
                templateUrl: "app/components/mappings/create/create.view.html",
                controller: 'MappingsCreateController',
                controllerAs: 'ctrl',
                data: { pageTitle: "Mapping create" },
                resolve: {
                    loggedin: isAuthenticated,
                    types: mappings.getTypes,
                    mapping: mappings.getMapping,
                    mime_types: mappings.getAvailableModules
                }
            })
            .state('mappings.edit', {
                url: "/edit/{type}",
                templateUrl: "app/components/mappings/edit/edit.view.html",
                controller: 'MappingsEditController',
                controllerAs: 'ctrl',
                data: { pageTitle: "Mapping edit" },
                resolve: {
                    loggedin: isAuthenticated,
                    types: mappings.getTypes,
                    mapping: mappings.getMapping,
                    mime_types: mappings.getAvailableModules
                }
            })
            .state('mappings.visualizations', {
                url: "/visualizations/{type}",
                templateUrl: "app/components/mappings/visualizations/visualizations.view.html",
                controller: 'MappingsVisualizationsController',
                controllerAs: 'ctrl',
                data: { pageTitle: "Edit mapping visualizations" },
                resolve: {
                    loggedin: isAuthenticated,
                    mapping: mappings.getMapping,
                    mime_types: mappings.getAvailableModules
                }
            })
            .state('cases', {
                url: "/cases",
                templateUrl: "app/components/cases/cases.view.html",
                controller: 'CasesController',
                controllerAs: 'ctrl',
                data: { pageTitle: "Case overview" },
                resolve: {
                    loggedin: isAuthenticated,
                    isAllowed: hasRoles([ROLES.manager])
                }
            })
            .state('cases.create', {
                url: "/create",
                templateUrl: "app/components/cases/create/create.view.html",
                controller: "CasesCreateController",
                controllerAs: 'ctrl',
                data: { pageTitle: "Create case" },
                resolve: {
                    loggedin: isAuthenticated,
                    isAllowed: hasRoles([ROLES.manager])
                }
            });
    }
})();


/**
 * Refreshes the user object in the rootscope.
 */
function refreshUser($http, $sessionStorage, $rootScope) {
    $http.get('/api/get_user', { "id": $rootScope.user.id })
        .success(function (data) {
            $rootScope.user = data;
            $sessionStorage.user = data;
        });
}


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
function getLoggedInUser($q, $http) {
    var deferred = $q.defer();

    $http.get('api/get_logged_in_user')
        .success(function (loggedInUser) {
            deferred.resolve(loggedInUser);
        });

    return deferred.promise;
}
function hasRoles(roles) {
    return function ($q, $rootScope, ROLES) {
        var deferred = $q.defer();

        for (var i = 0; i < roles.length; i++) {
            //Resolve state if roles match with user roles
            if (roles[i] === ROLES.admin && $rootScope.user.role == ROLES.admin || roles[i] === ROLES.manager && $rootScope.user.role == ROLES.manager
                || roles[i] === ROLES.user && $rootScope.user.role == ROLES.user) {
                return deferred.resolve();
            } else {
                // No match, do not resolve state
                deferred.reject();
            }
        }
        return deferred.promise;
    }
}


// Activate jQuery tooltips.
jQuery(function ($) {
    $(document).tooltip({
        selector: '[data-toggle="tooltip"]'
    });
});
