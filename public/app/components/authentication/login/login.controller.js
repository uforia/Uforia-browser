(function() {
    var mod = angular.module('authentication.login', []);

    mod.controller('AuthLoginController', AuthLoginController);

    function AuthLoginController($http, $scope, $state, $rootScope) {
        $scope.username = "";
        $scope.password = "";

        $scope.login = function() {
            $http.post('/auth', { username: $scope.username, password: $scope.password })
                .success(function(data) {
                    // $state.go('admin.overview');
                    toastr.success('Logged in successfully!');
                }).error(function(data) {
                    toastr.error('E-mailaddress and password did not match!')
                });
        };  
    }
    
})();