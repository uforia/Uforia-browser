(function() {
    var mod = angular.module('mappings.visualizations', []);

    mod.controller('MappingsVisualizationsController', MappingsVisualizationsController);

    function MappingsVisualizationsController($scope, $http, $stateParams, $state){
        var type = $stateParams.type;
        var fields;

        $http
            .post('api/mapping_info', {type: type})
            .success(function(data) {
                fields = data;
                $scope.fields = Object.keys(fields);
            });

        $scope.mapping = {name: type};

        var visualizations;
        $http
            .post('api/view_info?type=' + type)
            .success(function(data) {
                visualizations = data;
                $scope.visualizations = [];

                for(var key in visualizations){
                    $scope.visualizations.push(visualizations[key]);
                }


                if($scope.visualizations.length == 0)
                    $scope.visualizations.push({});

            });

        $scope.fields.push('Count');

        $scope.groupFind = function(item){
            return Object.keys(fields).indexOf(item) > -1 ? "Fields" : "Metadata";
        };

        $scope.types = {
            'chord': {
                type: 'chord',
                field1: 'From',
                field2: 'To',
                multiple: true
            },
            'bar': {
                type: 'bar',
                field1: 'X-Axis',
                field2: 'Y-Axis',
                extra_fields: {'SUM': 'Count'}
            },
            'area': {
                type: 'area',
                field1: 'X-Axis',
                field2: 'Y-Axis',
                extra_fields: {'SUM': 'Count'}
            },
            'graph': {
                type: 'graph',
                field1: 'From',
                field2: 'To',
                multiple: true
            },
            'narratives': {
                type: 'narratives',
                field1: 'Date',
                field2: 'People',
                multiple: true
            }
        };

        function setDefaults(){
            $scope.visualizations.forEach(function(item){
                if(item.maxresults == undefined || item.maxresults == null || item.maxresults == ""){
                    item.maxresults = "250";
                }
            });
        };

        $scope.save = function(){
            setDefaults();

            $http.post('/api/visualizations/save', {type: type, visualizations: $scope.visualizations})
                .success(function(data){
                    if(!data.error){
                        $state.go('mappings');
                    }
                });
        }

    }

})();
