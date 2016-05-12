(function() {
    var mod = angular.module('mappings',['mappings.create', 'mappings.edit']);

    mod.controller('MappingsController', MappingsController);

    function MappingsController($rootScope, $scope, $http, $modal, $timeout, types) {

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

        $scope.openVisualizations = function(type){
          var modalInstance = $modal.open({
            templateUrl: 'views/modals/visualizations.html',
            controller: 'visualizationModalCtrl',
            size: 'xl',
            scope: $scope,
            resolve: {
              type: function() { return type; },
              visualizations: model.getVisualizations(type),
              fields: model.getMappingFields(type)
              // files: model.getFileDetails({hashids: data.hashids, type:$scope.searchType, tables: data.tables}),
              // addresses: function(){ return data.adressses; }
            }
          });

          modalInstance.opened.then(function(){
            $scope.loading = false;
          });

          modalInstance.result.then(function () {
            //closed
          }, function () {

          });
        }

        $scope.pauseFilling = function(type){
          socket.emit('pauseFilling', {type: type});
        }
    }
})();
