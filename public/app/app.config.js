(function() {

    angular.module('uforia').config(config).run(function($rootScope, $state) {
        $rootScope.$state = $state;
    });

    /**
     * INSPINIA - Responsive Admin Theme
     *
     * Inspinia theme use AngularUI Router to manage routing and views
     * Each view are defined as state.
     * Initial there are written state for all view in theme.
     *
     */
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
            });
    }
})();