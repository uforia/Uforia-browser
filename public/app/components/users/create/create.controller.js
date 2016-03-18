
(function() {
    var mod = angular.module('users.create', []);

    mod.controller('UsersCreateController', UsersCreateController);

    function UsersCreateController($scope, $http, $state) {


        $scope.save = function(user) {
            $scope.cuErrorMessages = [];

            // Checks
            if (typeof user.firstName === "undefined") {
                $scope.cuErrorMessages.push('First name is required');
            }

            if (typeof user.lastName === "undefined") {
                $scope.cuErrorMessages.push('Last name is required');
            }

            if (typeof user.email === "undefined") {
                $scope.cuErrorMessages.push('Email is required');
            }

            if (typeof user.password === "undefined") {
                $scope.cuErrorMessages.push('Password is invalid. Make sure the password is at least 4 characters long.');
            }

            if (typeof user.password2 === "undefined") {
                $scope.cuErrorMessages.push('Make sure the passwords match.');
            }

            if ($scope.cuErrorMessages.length === 0) {

                if (user.password !== user.password2) {
                    $scope.cuErrorMessages.push('Password doesn\'t match.');

                } else if (user.password === user.password2) {
                    delete user.password2;
                    var addUser = true;

                    // Save user
                    if (addUser) {
                        $http.post('/api/save_user', user)
                            .success(function(data) {
                                if (typeof data.error !== 'undefined') {
                                    $scope.error.push(data.error.message);
                                    toastr.error('Please try again later.', 'Something went wrong!');
                                }

                                if (typeof data.response !== 'undefined') {
                                    if (data.response.created == true) {
                                        toastr.success(user.firstName + ' ' + user.lastName + ' was successfully created.', 'User created!');
                                        $state.go('^', {}, { reload: true });
                                    }
                                }
                            })
                            .error(function() {
                                toastr.error('Please try again later.', 'Something went wrong!');
                            });
                    }

                } else {
                    $scope.cuErrorMessages.push('Unknown error.');
                    toastr.error('Please try again later.', 'Something went wrong!');
                }
            }
        }
    }
})();