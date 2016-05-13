'use strict';

angular.module('users')
    .controller('ArchiveUserModalController', function($scope, $modalInstance, $http, user) {
        $scope.user = user;

        $scope.confirm = function() {
            var postData = {
                id: user.id
            };

            $http.post('/api/archive_user', postData)
                .success(function(data) {
                    if (typeof data.error !== 'undefined') {
                        toastr.error(data.error.message);
                    }
                    else if (typeof data.response !== 'undefined' && typeof data.response._version !== 'undefined') {
                        toastr.success('User has been archived');
                    }

                    $modalInstance.close();
                });
        };

        $scope.cancel = function() {
            $modalInstance.dismiss();
        };
    });