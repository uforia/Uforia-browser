(function() {
    var mod = angular.module('users', ['users.create']);

    mod.controller('UsersController', UsersController);

    function UsersController($scope, $http) {

        $scope.itemsByPage = 10;
        $scope.showNumberOfPages = 7;
        $scope.searchCollection = [];
        $scope.user = {
            isDeleted: 0
        };
        $scope.message = [];
        $scope.error = [];
        var users;

        $scope.rowCollection = [];

        var vm = this;
        vm.companies = [];

        if ($scope.isLoggedIn) {
            $http({
                method: 'GET',
                url: '/api/get_users'
            }).then(function successCallback(data) {
                // Check if error
                if (typeof data.data.error !== 'undefined') {
                    $scope.error.push(data.data.error.message);
                    $scope.isError = true;
                } else if (data.data.response.hits.total > 0) {

                    //Load users in table
                    angular.forEach(data.data.response.hits.hits, function(value, key) {
                        var u = value._source;
                        if (u.isDeleted == 0) {
                            $scope.rowCollection.push({
                                id: value._id, firstName: u.firstName, lastName: u.lastName, email: u.email,
                                role: u.role
                            });
                        }
                    });
                    $scope.searchCollection = $scope.rowCollection;
                    users = data.data.response.hits.hits;
                }
            }, function errorCallback(data) {
                toastr.error('Please try again later.', 'Something went wrong!');
            });
        }
    }
})();