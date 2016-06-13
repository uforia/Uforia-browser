'use strict';

angular.module('users')
    .controller('UnarchiveUserModalController', function($scope, $modalInstance, $http, user) {
        $scope.user = user;

        $scope.confirm = function() {
            var postData = {
                id: user.id
            };

            $http.post('/api/unarchive_user', postData)
                .success(function(data) {
                    if (typeof data.error !== 'undefined') {
                        toastr.error(data.error.message);
                    }
                    else if (typeof data.response !== 'undefined' && typeof data.response._version !== 'undefined') {
                        toastr.success('User has been unarchived');
                    }

                    $modalInstance.close();
                });
        };

        $scope.cancel = function() {
            $modalInstance.dismiss();
        };        
    });