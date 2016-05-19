
(function() {
    var mod = angular.module('profile', []);

    mod.controller('profileController', profileController);

    function profileController($scope, $http, $state, $stateParams, loggedInUser) {
        $scope.user = loggedInUser.response.hits.hits[0]._source;
        $scope.user.id = loggedInUser.response.hits.hits[0]._id;

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

    }

})();