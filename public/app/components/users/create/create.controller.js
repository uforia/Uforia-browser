
(function() {
    var mod = angular.module('users.create', []);

    mod.controller('UsersCreateController', UsersCreateController);

    function UsersCreateController($scope, $http, $state) {
        $scope.user = {};
        $scope.user.isDeleted = false;
        var users = {};


        $http({
            method: 'GET',
            url: '/api/get_users'
        }).then(function successCallback(data) {
            // Check if error
            if (typeof data.data.error !== 'undefined') {
                $scope.error.push(data.data.error.message);
                $scope.isError = true;
            } else if (data.data.response.hits.total > 0) {

                users = data.data.response.hits.hits;
            }
        }, function errorCallback(data) {
            toastr.error('Please try again later.', 'Something went wrong!');
        });

        angular.forEach(users, function(value, key){
            var u = value._source;
            if(user.email == u.email){
                addUser = false;
            }
        });
        
        $scope.save = function(user){
            var addUser = true;

            // Save user
            if(addUser) {
                var tempUser = angular.copy(user);
                delete tempUser.password2;
                console.log(tempUser);
                $http.post('/api/save_user', tempUser)
                    .success(function (data) {
                            if (typeof data.error !== 'undefined') {
                                toastr.error(data.error.message);
                            }

                            if (typeof data.response !== 'undefined') {
                                if (data.response.created == true) {
                                    toastr.success('User ' + tempUser.firstName + ' ' + tempUser.lastName +' has been added');
                                    $state.go('^');
                                }
                            }
                        }
                    );
            } else if (!addUser){
                toastr.error('An user with this email address already exists');
            } else {
                toastr.error('Unknown error');
            }
        };
    }
})();