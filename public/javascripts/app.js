
angular.module('uforia',
    ['ui.router', 'ui.bootstrap.modal', 'ui.bootstrap.datepicker', 'dndLists', 'ui', 'ui.select'])

  .run(function($rootScope) {
    $rootScope.mappings = {};
    socket = io.connect();
    socket.on('connect', function(){

    });
    socket.on('uforia', function(info){
      $rootScope.mappings[info.mapping] = info;
      $rootScope.$apply();
    });

    $rootScope.$on('$stateChangeStart', function(event, toState){
        // Would print "Hello World!" when 'parent' is activated
        // Would print "Hello UI-Router!" when 'parent.child' is activated
    })
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
        templateUrl: "views/search",
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
            loggedin: checkLoggedin
        }
      })
      .state('admin.overview', {
        url: "",
        templateUrl: "views/admin",
        controller: 'adminCtrl',
        resolve: {
          // modules: model.getAvailableModules,
          types: model.getTypes,
          loggedin: checkLoggedin
          
        }
      })
      .state('admin.mapping', {
        url: "/mapping/{type}",
        templateUrl: "views/mapping",
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
        templateUrl: "views/authentication/login",
        controller: 'loginCtrl'
      });
  });



function checkLoggedin($q, $timeout, $http, $location, $rootScope){ 
    // Initialize a new promise 
    var deferred = $q.defer(); 
    // Make an AJAX call to check if the user is logged in 
    $http.get('/logged-in').success(function(user){ 
        // Authenticated 
        if (user !== '0') deferred.resolve(); 
        // Not Authenticated 
        else { 
            $rootScope.message = 'You need to log in.'; 
            deferred.reject();
            $location.url('/login');
        } 
    }); 
    return deferred.promise; 
};