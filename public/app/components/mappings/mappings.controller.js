(function () {
    var mod = angular.module('mappings', ['mappings.create', 'mappings.edit', 'mappings.visualizations']);

    mod.controller('MappingsController', MappingsController);

    function MappingsController($rootScope, $scope, $http, $timeout, types, $modal) {

        $scope.types = types;
        $scope.test = [];
        $scope.fields = ['test', 'blaa'];
        $scope.deleteMapping = deleteMapping;

        $scope.pauseFilling = function (type) {
            socket.emit('pauseFilling', { type: type });
        }

        function deleteMapping(mapping) {

            var modalInstance = $modal.open({
                templateUrl: 'app/components/mappings/modals/deleteMappingModal.html',
                controller: 'deleteMappingModalController',
                size: 'md',
                resolve: {
                    mapping: function () {
                        return mapping;
                    }
                },
            });

            modalInstance.result.then(function () {

                },
                function () {
                });
        }
    }
})();
