angular.module('uforia')

.controller('appCtrl', function($rootScope){
  $rootScope.Utils = {
     keys : Object.keys
  }
})

.controller('searchCtrl', function($rootScope, $scope, $http, $modal, $timeout, types) {
  $scope.queryMatchesCount = 0;

  $scope.searchTypes = types;
  $scope.searchType = Object.keys(types)[0];
  $scope.parameters = [{operator: "must", andOr: "And"}];
  var visualization = {};

  $timeout(function(){
    $scope.$watch('searchType', function(newVal, oldVal){
      changeType(newVal);
    });

    $scope.$watch('viewType', function(newVal, oldVal){
      if($scope.searchForm.$valid){
        changeScripts();
        $scope.search();
      }
    });

    $scope.$watch('parameters', function(newVal, oldVal){
      var api_params = {};
      if($scope.searchForm.$valid){
        $scope.loading = true;
        $http
          .post('api/count', formatParams())
          .success(function(data){
            $scope.loading = false;
            $scope.loading=false;
            if(!data.error)
              $scope.queryMatchesCount = data.count;
            else 
              $scope.errorMessage = data.error.message;
          });
      }
    }, true);
  },0);

  $scope.openDatePicker = function($event, index, parameter){
    $event.preventDefault();
    $event.stopPropagation();
    $scope.parameters[index][parameter] = true;
  }

  $scope.add = function($index){
    $scope.parameters.splice($index+1, 0, {
      operator: "must",
      andOr: "And"
    });
  }

  $scope.remove = function($index){
    $scope.parameters.splice($index,1);
    $scope.parameters[0].andOr = 'And';
  }

  //Load the right css for the right D3 visualization
  function changeType(type){

    switch(type){
      case "files":
        $scope.viewType = 'bubble';
      break;
      case "email":
        $scope.viewType = 'chord';
      break; 
      case "documents":
        $scope.viewType = 'bar_chart';
        //THIS should be moved to something seperate - bart 28-9-2014
        visualization.x = prompt("Order X axis by");
        visualization.y = prompt("Order Y axis by");

      break;
      default:
        $scope.searchType = 'email';
        $scope.viewType = 'chord';
      break;
    }
    $http
      .post("api/mapping_info", {type: type})
      .success(function(data){
        $scope.memeTypes = data;
      });

    $http
      .post("api/view_info?type=" + type, '')
      .success(function(data){
        $scope.viewTypes = data;
      });

    //Clear the visualization and search parameters
    removeSVG();
    // if(type=='email')
    //   $scope.parameters = [{memeType: "Body", operator: "must", query: "blockbuster"},{memeType: "Bcc", operator: "must", query: "*frank*"}];
    // else
    $scope.parameters = [{operator: "must", andOr: "And"}];
  }

  $scope.search = function(){
    //Clear the old SVG
    removeSVG();
    hideMessage();
    
    getData(formatParams(), function(data){
      $('#d3_visualization').empty();
      if(data.total > 0){
        render(data, {height: window.innerHeight-65}, openDetails, function(error){
          if(error)
            console.log(error); // TODO: show error to user
          else{
            $('html, body').animate({
              scrollTop: $("#d3_visualization").offset().top - 65
            }, 1000);
          }
        });
      }
    });
  }

  //click on a item
  function openDetails(data){
    $scope.loading = true;
    var modalInstance = $modal.open({
      templateUrl: 'views/modals/details',
      controller: 'detailsModalCtrl',
      size: 'lg',
      resolve: {
        files: model.getFileDetails({hashids: data.hashids, type:$scope.searchType}),
        addresses: function(){ return data.adressses; }
      }
    });

    modalInstance.opened.then(function(){
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

  function getData(params, cb){
    $scope.loading=true;
    $http
      .post('api/search', params)
      .success(function(data){
        $scope.loading=false;
        cb(data);
      });
  }

  function formatParams(cb){
    var api_params = {
        'type' : $scope.searchType,
        'view' : $scope.viewType,
        'visualization' : visualization,
        'parameters' : {
            'must' : [],
            'must_not' : []
        },
        'filters' : {
            'must' : [],
            'must_not' : []
        }
    };

    //Get all the search parameters and add them to the query object.
    $scope.parameters.forEach(function(parameter){
      if(parameter.memeType && parameter.memeType.toLowerCase() == 'date' && parameter.startDate && parameter.endDate){
        api_params.filters[parameter.operator].push({'field' : parameter.memeType, 'start_date' : parameter.startDate.getTime(), 'end_date' :  parameter.endDate.getTime()});
      }
      else if(parameter.query && parameter.query.length > 0){
        api_params.parameters[parameter.operator].push({'field' : parameter.memeType, 'query' : parameter.query});
      }
    });
    return api_params;
  }

  //clear the d3 svg from the page
  function removeSVG(){
    $('#d3_visualization').empty();
  }

  function showMessage(message){
    $("#message").text(message);
    $("#message").attr("style", "visibility: visible")
  }

  function hideMessage(){
    $("#message").empty();
    $("#message").attr("style", "visibility: hidden")
  }

  function changeScripts(){
    $('#d3_script').replaceWith("<script src=\"javascripts/mimetypes/" + $scope.searchType + "_" + $scope.viewType + ".js\" type=\"text/javascript\" id=\"d3_script\"></script>");
    $('#d3_style').replaceWith("<link href=\"stylesheets/mimetypes/" + $scope.searchType + "_" + $scope.viewType +  ".css\" rel=\"stylesheet\" type=\"text/css\" id=\"d3_style\">");
  }

})

.controller('detailsModalCtrl', function($scope, $modalInstance, files, addresses){
  $scope.addresses = addresses;
  $scope.files = files;
  $scope.modalInstance = $modalInstance;
  $scope.selectedFile = files[0].hashid;

  $scope.openFile = function(hashid){
    files.forEach(function(file){
      if(file.hashid == hashid)
        $scope.showFile = file;
    })
  }
  $scope.openFile($scope.selectedFile);

})

.controller('adminCtrl', function($scope, modules){
  console.log(modules);
  $scope.modules = modules;
  $scope.mapping = {};
  $scope.mapping.selectedFields = {};
  $scope.selectedModules = undefined;

  $scope.models = {
    selected: null,
    lists:{
      fields: [],
      selectedFields: []
    }
  };

  $scope.$watch('selectedModules', function(newVal){
    if(newVal && newVal.length > 0){
      $scope.fields = {};
      $scope.fields[newVal] = modules[newVal].fields;
      console.log($scope.fields);
    }
    $scope.selectFields = undefined;
  })

  $scope.$watch('selectFields', function(newVal){
    if(newVal && newVal.length > 0){
      newVal.forEach(function(item){
        var module = item.split(':')[0];
        var field = item.split(':')[1];
        if($scope.fields[module] && (!$scope.mapping.selectedFields[module] || $scope.mapping.selectedFields[module].indexOf(field) == -1)){
          $scope.mapping.selectedFields[module] = $scope.mapping.selectedFields[module] || [];
          $scope.mapping.selectedFields[module].push(field);
        }
      });
    }
  }); 

  $scope.$watch('deselectFields', function(newVal){
    if(newVal && newVal.length > 0){
      newVal.forEach(function(item){
        var module = item.split(':')[0];
        var field = item.split(':')[1];
        if($scope.mapping.selectedFields[module] && $scope.mapping.selectedFields[module].indexOf(field) != -1){
          $scope.mapping.selectedFields[module].splice($scope.mapping.selectedFields[module].indexOf(field), 1);
          if($scope.mapping.selectedFields[module].length ==0)
            delete $scope.mapping.selectedFields[module];
        }
      });
    }
  });

  $scope.getSize = function(object){
    var count = 1;
    for(var key in object){
      count++;
      count+=object[key].length;
    }
    return count;
  }

  $scope.createMapping = function(){
    console.log($scope.mapping);

    var mapping = {
      name: $scope.mapping.name,
      modules: {},
      fields: {},
      visualizations: $scope.mapping.visualizations
    }

    for(var module in $scope.mapping.selectedFields){

      for(var type in modules[module].meme_types){
        $scope.mapping.selectedFields[module].forEach(function(field){
          mapping.fields[field] = mapping.fields[field] || [];
          mapping.fields[field].push(type);
        });

        mapping.modules[type] = modules[module].meme_types[type];
      }
    }

    console.log(mapping);
  }
});