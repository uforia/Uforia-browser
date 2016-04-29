(function () {
    var mod = angular.module('search.details', []);

    mod.controller('SearchDetailsController', SearchDetailsController);

    function SearchDetailsController($scope, $http, $modalInstance, files, addresses) {
        $scope.addresses = addresses;
        $scope.files = files;
        // console.log(files);
        $scope.modalInstance = $modalInstance;

        $scope.filesLink = window.location.origin + window.location.pathname + 'api/files?hashids=';

        for (var i = 0; i < files.length; i++) {
            if (i > 0) $scope.filesLink += ',';
            $scope.filesLink += files[i].hashid;
        }

        $scope.$watch('selectedFile', function (value) {
            if (value) {
                $scope.showFile = typeof value == 'string' ? JSON.parse(value) : value;
                // console.log($scope.showFile);
                $http.get('api/file/' + $scope.showFile.hashid)
                    .success(function (data) {
                        $scope.showFile.content = data;
                    });

                $http.get('api/file/' + $scope.showFile.hashid + '/validate')
                    .success(function (data) {
                        $scope.showFile.verification = data;
                    });
            }
        });

        $scope.selectedFile = JSON.stringify(files[0]);

        $scope.copyLink = function (file) {
            var link = window.location.origin + window.location.pathname + 'api/file/' + file.hashid;
            prompt('Copy the link below:', link);
        }

        $scope.copyFilesLink = function () {
            prompt('Copy the link below:', $scope.filesLink);
        }

    }
})();