
angular.module('uforia',
    ['ui.router', 'ui.bootstrap.modal', 'ui.bootstrap.datepicker', 'dndLists', 'ui', 'ui.select'])
  
  .run(function($rootScope) {
    $rootScope.mappings = {};
    socket = io.connect();
    socket.on('connect', function(){
      console.log(socket);
    });
    socket.on('uforia', function(info){
      console.log(info);
      $rootScope.mappings[info.mapping] = info;
      $rootScope.$apply();
    });

    $rootScope.$on('$stateChangeStart', function(event, toState){ 
        console.log(toState);

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
        template: '<ui-view/>'
      })
      .state('admin.overview', {
        url: "",
        templateUrl: "views/admin",
        controller: 'adminCtrl',
        resolve: {
          // modules: model.getAvailableModules,
          types: model.getTypes
        }
      })
      .state('admin.mapping', {
        url: "/mapping/{type}",
        templateUrl: "views/mapping",
        controller: 'mappingCtrl',
        parent: 'admin',
        resolve: {
          modules: model.getAvailableModules,
          types: model.getTypes,
          mapping: model.getMapping
        }
      });
  });
