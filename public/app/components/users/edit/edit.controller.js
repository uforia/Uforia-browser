
(function() {
    var mod = angular.module('users.edit', []);

    mod.controller('UsersEditController', UsersEditController);

    function UsersEditController($scope, $http, $state, $stateParams) {

        $scope.clearFields = function (changePassword) {
            if (!changePassword){
                $scope.user.password="";
                $scope.user.password2="";
            }
        };

        $scope.save = function(user){
            console.log(user);

            if ((typeof user.password === "undefined" || user.password =="") && (typeof user.password2 === "undefined" || user.password =="")){
                delete user.password;
                delete user.password2;

            } else if(user.password === user.password2){
                delete user.password2;
            }

            $http.post('/api/edit_user', $scope.user)
                .success(function (data) {
                        if (typeof data.error !== 'undefined') {
                            toastr.error(data.error.message);
                        }

                        if (typeof data.response !== 'undefined' && typeof data.response._version !== 'undefined') {
                            toastr.success('Changes have been updated');
                            delete user.password;
                        }
                    }
                );
        };

        $scope.user = {};
        $scope.user.id = $stateParams.userId;
        $http({
            method: 'GET',
            url: '/api/get_user',
            params: $scope.user
        }).then(function successCallback(data) {
            // Check if error
            if (typeof data.data.error !== 'undefined') {
                $scope.error.push(data.data.error.message);
                $scope.isError = true;
            } else if (data.data.response.hits.total === 1) {

                var u = data.data.response.hits.hits[0]._source;
                $scope.user.firstName=u.firstName, $scope.user.lastName=u.lastName, $scope.user.email=u.email, $scope.user.role=u.role;
            }
            else {
                toastr.error('Something went wrong!');
            }
        }, function errorCallback(data) {
            toastr.error('Please try again later.', 'Something went wrong!');
        });
    };

})();