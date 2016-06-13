
(function() {
    var mod = angular.module('cases.edit', []);

    mod.controller('CasesEditController', CasesEditController);

    function CasesEditController($scope, $http, $state, $stateParams) {

        $scope.formData = {};

        $http({
            method: 'GET',
            url: '/api/get_filtered_users'
        }).then(function successCallback(data) {
            // Check if error
            if (typeof data.data.error !== 'undefined') {
                $scope.error.push(data.data.error.message);
                $scope.isError = true;
            } else if (data.data.response.hits.total > 0) {
                $scope.formData.users = data.data.response.hits.hits;

            }
        }, function errorCallback(data) {
            toastr.error('Please try again later.', 'Something went wrong!');
        });


        $scope.save = function(cases){
          // console.log(cases);
          console.log($scope.cases);

          $http.post('/api/edit_case', $scope.cases)
              .success(function (data) {
                      if (typeof data.error !== 'undefined') {
                          toastr.error(data.error.message);
                      }

                      if (typeof data.response !== 'undefined' && typeof data.response._version !== 'undefined') {
                          toastr.success('Changes have been updated');
                          $state.go('^');
                      }
                  }
              );
        };

        $scope.cases = {};
        $scope.cases.id = $stateParams.caseId;
        $http({
            method: 'GET',
            url: '/api/get_case',
            params: $scope.cases
        }).then(function successCallback(data) {
            // Check if error
            if (typeof data.data.error !== 'undefined') {
                $scope.error.push(data.data.error.message);
                $scope.isError = true;
            } else if (data.data.response.hits.total === 1) {
                var u = data.data.response.hits.hits[0]._source;
                console.log(u);
                $scope.cases.name = u.name;
                $scope.cases.leadInvestigator=u.leadInvestigator;
                $scope.cases.investigators=u.investigators;
                setTimeout(function(){
                  $(".chosen-select").chosen();
                },0.1);;
            }
            else {
                toastr.error('Something went wrong!');
            }
        }, function errorCallback(data) {
            toastr.error('Please try again later.', 'Something went wrong!');
        });
    };

})();
