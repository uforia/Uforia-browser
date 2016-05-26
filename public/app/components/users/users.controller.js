(function() {
    var mod = angular.module('users', ['users.create', 'users.edit']);

    mod.controller('UsersController', UsersController);

    function UsersController($scope, $http, $modal) {

        $scope.itemsByPage = 10;
        $scope.showNumberOfPages = 7;
        $scope.searchCollection = [];
        $scope.user = {
            isDeleted: false
        };
        $scope.archiveUser = archiveUser;
        $scope.unarchiveUser = unarchiveUser;
        $scope.message = [];
        $scope.error = [];
        var users;

        $scope.rowCollection = [];

        var vm = this;
        vm.companies = [];

        function loadUsers() {
            $http({
                method: 'GET',
                url: '/api/get_users'
            }).then(function successCallback(data) {
                // Check if error
                if (typeof data.data.error !== 'undefined') {
                    $scope.error.push(data.data.error.message);
                    $scope.isError = true;
                } else if (data.data.response.hits.total > 0) {
                    $scope.rowCollection = [];

                    //Load users in table
                    angular.forEach(data.data.response.hits.hits, function(value, key) {
                        var user = value._source;
                        $scope.rowCollection.push({
                            id: value._id,
                            firstName: user.firstName,
                            lastName: user.lastName,
                            email: user.email,
                            role: user.role,
                            isDeleted: user.isDeleted
                        });
                    });
                    
                    $scope.searchCollection = $scope.rowCollection;
                    users = data.data.response.hits.hits;
                }
            }, function errorCallback(data) {
                toastr.error('Please try again later.', 'Something went wrong!');
            });
        }

        function archiveUser(user) {
            var modalInstance = $modal.open({
                templateUrl: 'app/components/users/modals/archiveUserModal.html',
                controller: 'ArchiveUserModalController',
                size: 'md',
                resolve: {
                    user: function() {
                        return user;
                    }
                },
            });

            modalInstance.result.then(function() {
                loadUsers();
            },
            function() {
            });
        }

        function unarchiveUser(user) {
            var modalInstance = $modal.open({
                templateUrl: 'app/components/users/modals/unarchiveUserModal.html',
                controller: 'UnarchiveUserModalController',
                size: 'md',
                resolve: {
                    user: function() {
                        return user;
                    }
                },
            });

            modalInstance.result.then(function() {
                loadUsers();
            },
            function() {
            });
        };

        if ($scope.isLoggedIn) {
            loadUsers();
        }
    }
})();