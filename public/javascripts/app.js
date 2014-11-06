angular.module('uforia',
    ['ui.router', 'ui.bootstrap.modal'])
  
  .run(function($rootScope) {

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
        url: "/admin",
        templateUrl: "views/admin",
        controller: 'adminCtrl',
        resolve: {
          // types: model.getTypes
        }
      });
  });
