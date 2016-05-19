'use strict';

angular.module('mappings')
    .controller('deleteMappingModalController', function($scope, $modalInstance, $http, mapping) {
        $scope.mapping = mapping;

        $scope.confirm = function() {
            var postData = {
                id: mapping.id
            };
            $http.post('./api/delete_mapping', {type: mapping})
                .success(function(data){
                    console.log(data);
                //   $scope.types.splice(index, 1);
                  if (typeof data.error !== 'undefined') {
                      toastr.error(data.error.message);
                  }
                  else if (typeof data.response !== 'undefined') {
                      toastr.success('Mapping has been deleted');
                  }

                  $modalInstance.close();
              });
        };

        $scope.cancel = function() {
            $modalInstance.dismiss();
        };
    });
