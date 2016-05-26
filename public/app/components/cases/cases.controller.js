(function() {
    var mod = angular.module('cases', ['cases.create']);

    mod.controller('CasesController', CasesController);

    function CasesController($scope, $http) {
        $scope.itemsByPage = 10;
        $scope.showNumberOfPages = 7;
        $scope.searchCollection = [];

        $scope.message = [];
        $scope.error = [];
        var cases;

        $scope.rowCollection = [];

        var vm = this;
        vm.companies = [];

        function loadCases() {
            $http({
                method: 'GET',
                url: '/api/get_cases'
            }).then(function successCallback(data) {
                // Check if error
                if (typeof data.data.error !== 'undefined') {
                    $scope.error.push(data.data.error.message);
                    $scope.isError = true;
                } else if (data.data.response.hits.total > 0) {
                    $scope.rowCollection = [];

                    //Load users in table
                    angular.forEach(data.data.response.hits.hits, function(value, key) {
                        var cases = value._source;
                        $scope.rowCollection.push({
                            id: value._id,
                            name: cases.name,
                            caseStarted: cases.caseStarted,
                            caseClosed: cases.caseClosed,
                            leadInvestigator: cases.leadInvestigator,
                            investigators: cases.investigators
                        });
                    });

                    $scope.searchCollection = $scope.rowCollection;
                    cases = data.data.response.hits.hits;
                }
            }, function errorCallback(data) {
                toastr.error('Please try again later.', 'Something went wrong!');
            });
        }


        if ($scope.isLoggedIn) {
            loadCases();
        }

    }
})();
