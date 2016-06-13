(function () {
    var mod = angular.module('cases', ['cases.create', 'cases.edit']);

    mod.controller('CasesController', CasesController);

    function CasesController($scope, $http) {
        $scope.itemsByPage = 10;
        $scope.showNumberOfPages = 7;
        $scope.searchCollection = [];

        // Set active case.
        $scope.activeRow = "";
        getActiveCase($scope, $http);

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
                } else {
                    $scope.rowCollection = {};
                    angular.forEach(data.data.response, function(value, key) {
                        $scope.rowCollection[value._id] = {
                          id: value._id,
                          name: value._source.name,
                          caseStarted: value._source.caseStarted,
                          // caseClosed: cases.caseClosed,
                          leadInvestigator: value.leadInvestigator,
                          investigators: value.investigators
                        };
                      });
                    // Load cases in table.
                    // angular.forEach(data.data.response.hits.hits, function (value, key) {
                    //     var cases = value._source;
                    //
                    //     // Create collection of cases.
                    //     $scope.rowCollection[value._id] = {
                    //         id: value._id,
                    //         name: cases.name,
                    //         caseStarted: cases.caseStarted,
                    //         caseClosed: cases.caseClosed,
                    //         leadInvestigator: cases.leadInvestigator,
                    //         investigators: cases.investigators
                    //     };
                    //
                    // });

                    $scope.searchCollection = $scope.rowCollection;
                    // cases = data.data.response.hits.hits;
                }
            }, function errorCallback(data) {
                toastr.error('Please try again later.', 'Something went wrong!');
            });
        }

        /**
         * Sets object.active of the row to true and the old object to false.
         */
        $scope.setActiveRow = function (id) {
            var data = { userId: $scope.user.id, caseId: id };

            // Update user preferences to the active case.
            $http.post('/api/edit_user_preferences', data)
                .success(function (data) {
                    $scope.activeRow = id;
                    console.log("Active case saved.");
                });
        }

        if ($scope.isLoggedIn) {
            loadCases();
        }

    }
})();

/**
 * Gets the id of the current case in the user object and sets the active row.
 */
function getActiveCase($scope, $http) {
    $http.get('api/get_active_case?userId=' + $scope.user.id)
        .success(function (caseId) {
            $scope.activeRow = caseId.response;
        });
}