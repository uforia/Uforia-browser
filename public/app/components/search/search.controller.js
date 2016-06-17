(function () {
    var mod = angular.module('search', ['search.details']);

    mod.controller('SearchController', SearchController);

    function SearchController($scope, $http, $modal, $timeout, types) {
        $scope.queryMatchesCount = 0;
        $scope.maxResultCount = 0;

        $scope.searchTypes = types;
        $scope.searchType = $scope.searchTypes[0];
        $scope.parameters = [{ operator: "must", andOr: "And" }];
        var visualization = {};

        $scope.$watch('viewType', function (newVal, oldVal) {
            if (newVal) {
                removeSVG();
                changeScripts(function () {
                    if ($scope.searchForm.$valid && $scope.queryMatchesCount < $scope.maxResultCount) {
                        $scope.search();
                    }
                });
            }
        });

        $timeout(function () {
            $scope.$watch('searchType', function (newVal, oldVal) {
                changeType(newVal);
            });

            $scope.$watch('parameters', function (newVal, oldVal) {
                var api_params = {};
                if ($scope.searchForm.$valid) {
                    $scope.loading = true;
                    $http
                        .post('api/count', formatParams())
                        .success(function (data) {
                            $scope.loading = false;
                            if (!data.error) {
                                $scope.queryMatchesCount = data.count;
                                delete $scope.errorMessage;
                            }
                            else
                                $scope.errorMessage = data.error.message;
                        });
                }
            }, true);
        }, 0);

        $scope.openDatePicker = function ($event, index, parameter) {
            $event.preventDefault();
            $event.stopPropagation();
            $scope.parameters[index][parameter] = true;
        }

        $scope.add = function ($index) {
            $scope.parameters.splice($index + 1, 0, {
                operator: "must",
                andOr: "AND"
            });
        }

        $scope.remove = function ($index) {
            $scope.parameters.splice($index, 1);
            $scope.parameters[0].andOr = 'AND';
        }

        $scope.selectType = function () {
            $scope.maxResultCount = $scope.viewTypes[$scope.viewIndex].maxresults;
            $scope.viewType = $scope.viewTypes[$scope.viewIndex].type;
        }

        //Load the right css for the right D3 visualization
        function changeType(type) {

            $http
                .post("api/mapping_info", { type: type })
                .success(function (data) {
                    $scope.memeTypes = data;
                });

            $http
                .post("api/view_info?type=" + type, '')
                .success(function (data) {
                    console.log(data);
                    $scope.viewTypes = [];
                    angular.forEach(data, function (data2) {
                        $scope.viewTypes.push(data2);
                    });

                    $scope.viewType = data[0].type;
                    $scope.maxResultCount = data[0].maxresults;
                });

            //Clear the visualization and search parameters
            removeSVG();
            // if(type=='email')
            //   $scope.parameters = [{memeType: "Body", operator: "must", query: "blockbuster"},{memeType: "Bcc", operator: "must", query: "*frank*"}];
            // else
            $scope.parameters = [{ operator: "must", andOr: "And" }];
        }

        $scope.search = function () {
            //Clear the old SVG
            removeSVG();
            hideMessage();

            getData(formatParams(), function (data) {
                $('#d3_visualization').empty();
                if (data.total > 0 && data.total) {
                    render(data, { height: window.innerHeight - 65 }, openDetails, function (error) {
                        if (error)
                            console.log(error); // TODO: show error to user
                        else {
                            $('html, body').animate({
                                scrollTop: $("#d3_visualization").offset().top - 65
                            }, 1000);
                        }
                    });
                }
                else {
                    console.log('No data');
                    console.log(data);
                }
            });
        }

        //click on a item
        function openDetails(data) {
            console.log(data);
            $scope.loading = true;
            var modalInstance = $modal.open({
                templateUrl: 'app/components/search/details/details.html',
                controller: 'SearchDetailsController',
                controllerAs: 'detailsModalCtrl',
                size: 'xl',
                resolve: {
                    files: search.getFileDetails({ hashids: data.hashids, type: $scope.searchType, tables: data.tables }),
                    addresses: function () { return data.adressses; }
                }
            });

            modalInstance.opened.then(function () {
                $scope.loading = false;
            });

            modalInstance.result.then(function () {
                //closed
            }, function () {
                $('html, body').animate({
                    scrollTop: $("#d3_visualization").offset().top
                }, 1000);
            });
            // var url = 'file_details?type=email&hashids=' + d.hashids.toString() + '&address1=' + d.date;
            // window.open(url, d.hashids.toString(),'height=768, width=1100, left=100, top=100, resizable=yes, scrollbars=yes, toolbar=no, menubar=no, location=no, directories=no, status=no, location=no');
        }

        function getData(params, cb) {
            $scope.loading = true;
            $http
                .post('api/search', params)
                .success(function (data) {
                    $scope.loading = false;
                    cb(data);
                });
        }

        function formatDate(date) {
            var dateParts = date.split('-');
            return dateParts[2] + '-' + dateParts[1] + '-' + dateParts[0];
        }

        function formatParams(cb) {
            var api_params = {
                'type': $scope.searchType,
                'view': $scope.viewType,
                'visualization': visualization,
                'query': ""
            };

            //Get all the search parameters and add them to the query object.
            $scope.parameters.forEach(function (parameter) {
                if (parameter.memeType && $scope.memeTypes[parameter.memeType].type == 'date' && !isNaN(parameter.startDate.getTime()) && !isNaN(parameter.endDate.getTime())) {
                    if (api_params.query.length > 0)
                        api_params.query += ' ' + parameter.andOr + ' ';

                    if (parameter.operator == 'must_not')
                        api_params.query += ' NOT ';

                    api_params.query += parameter.memeType + ':[' + parameter.startDate.getFullYear() + '-' + (parameter.startDate.getMonth() + 1) + '-' + parameter.startDate.getDate() + ' TO ' + parameter.endDate.getFullYear() + '-' + (parameter.endDate.getMonth() + 1) + '-' + parameter.endDate.getDate() + ']';
                }
                else if (parameter.query && parameter.query.length > 0) {
                    if (api_params.query.length > 0)
                        api_params.query += ' ' + parameter.andOr + ' ';

                    if (parameter.operator == 'must_not')
                        api_params.query += ' NOT ';

                    api_params.query += parameter.memeType + ':' + parameter.query;
                }
            });
            console.log(api_params);
            return api_params;
        }

        //clear the d3 svg from the page
        function removeSVG() {
            $('#d3_visualization').empty();
        }

        function showMessage(message) {
            $("#message").text(message);
            $("#message").attr("style", "visibility: visible")
        }

        function hideMessage() {
            $("#message").empty();
            $("#message").attr("style", "visibility: hidden")
        }

        function changeScripts(cb) {
            if ($scope.viewType) {
                $timeout(function () {
                    if ($('#d3_style').length == 0) {
                        $('head').append("<link href=\"assets/css/visualizations/" + $scope.viewType.toLowerCase() + ".css\" rel=\"stylesheet\" type=\"text/css\" id=\"d3_style\">");
                    }
                    else {
                        $('#d3_style').replaceWith("<link href=\"assets/css/visualizations/" + $scope.viewType.toLowerCase() + ".css\" rel=\"stylesheet\" type=\"text/css\" id=\"d3_style\">");
                    }
                    $('#d3_script').replaceWith("<script src=\"assets/js/visualizations/" + $scope.viewType.toLowerCase() + ".js\" type=\"text/javascript\" id=\"d3_script\"></script>");
                    cb();
                });
            }
        }

    }
})();