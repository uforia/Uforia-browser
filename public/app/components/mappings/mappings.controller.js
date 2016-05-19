(function() {
    var mod = angular.module('mappings',['mappings.create', 'mappings.edit', 'mappings.visualizations']);

    mod.controller('MappingsController', MappingsController);

    function MappingsController($rootScope, $scope, $http, $timeout, types, $modal) {

        $scope.types = types;
        $scope.test = [];
        $scope.fields = ['test', 'blaa'];
        $scope.deleteMapping = deleteMapping;
        // $scope.deleteMapping = function(type, index){
        //   if(confirm("Are you sure you want to delete the mapping '" + type + "'?")){
        //     $http.post('./api/delete_mapping', {type: type})
        //         .success(function(data){
        //           $scope.types.splice(index, 1);
        //         })
        //   }
        // }

        $scope.pauseFilling = function(type){
          socket.emit('pauseFilling', {type: type});
        }

        console.log($rootScope);


        function deleteMapping(mapping) {
            console.log("test");
            var modalInstance = $modal.open({
                templateUrl: 'app/components/mappings/modals/deleteMappingModal.html',
                controller: 'deleteMappingModalController',
                size: 'md',
                resolve: {
                    mapping: function() {
                        return mapping;
                    }
                },
            });

            modalInstance.result.then(function() {
                // MappingsController();
            },
            function() {
            });
        }
    }
})();
