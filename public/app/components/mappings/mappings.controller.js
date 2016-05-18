(function() {
    var mod = angular.module('mappings',['mappings.create', 'mappings.edit', 'mappings.visualizations']);

    mod.controller('MappingsController', MappingsController);

    function MappingsController($rootScope, $scope, $http, $timeout, types) {

        $scope.types = types;
        $scope.test = [];
        $scope.fields = ['test', 'blaa'];

        $scope.deleteMapping = function(type, index){
          if(confirm("Are you sure you want to delete the mapping '" + type + "'?")){
            $http.post('./api/delete_mapping', {type: type})
                .success(function(data){
                  $scope.types.splice(index, 1);
                })
          }
        }

        $scope.pauseFilling = function(type){
          socket.emit('pauseFilling', {type: type});
        }

        console.log($rootScope);
    }
})();
