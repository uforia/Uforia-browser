angular.module('uforia')

.controller('appCtrl', function($rootScope){
  $rootScope.Utils = {
     keys : Object.keys
  }
})

.controller('searchCtrl', function($rootScope, $scope, $http, $modal, $timeout, types) {
  $scope.queryMatchesCount = 0;

  console.log(types.length);

  $scope.searchTypes = types;
  $scope.searchType = $scope.searchTypes[0];
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
        console.log(formatParams());
        $http
          .post('api/count', formatParams())
          .success(function(data){
            $scope.loading = false;
            $scope.loading=false;
            if(!data.error){
              $scope.queryMatchesCount = data.count;
              delete $scope.errorMessage;
            }
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
      andOr: "AND"
    });
  }

  $scope.remove = function($index){
    $scope.parameters.splice($index,1);
    $scope.parameters[0].andOr = 'AND';
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
        // $scope.searchType = 'email';
        // $scope.viewType = 'chord';
      break;
    }
    $http
      .post("api/mapping_info", {type: type})
      .success(function(data){
        // console.log(data);
        $scope.memeTypes = data;
      });

    $http
      .post("api/view_info?type=" + type, '')
      .success(function(data){
        // console.log(data);
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
      console.log(data);
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
      else {
        console.log('No data');
        console.log(data);
      }
    });
  }

  //click on a item
  function openDetails(data){
    // console.log(data);
    $scope.loading = true;
    var modalInstance = $modal.open({
      templateUrl: 'views/modals/details',
      controller: 'detailsModalCtrl',
      size: 'lg',
      resolve: {
        files: model.getFileDetails({hashids: data.hashids, type:$scope.searchType, tables: data.tables}),
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

  function formatDate(date){
    var dateParts = date.split('-');
    return dateParts[2] + '-' + dateParts[1] + '-' + dateParts[0];
  }

  function formatParams(cb){
    var api_params = {
        'type' : $scope.searchType,
        'view' : $scope.viewType,
        'visualization' : visualization,
        'query': ""
    };

    //Get all the search parameters and add them to the query object.
    $scope.parameters.forEach(function(parameter){
      if(parameter.memeType && parameter.memeType.toLowerCase() == 'date' && !isNaN(parameter.startDate.getTime()) && !isNaN(parameter.endDate.getTime())){
        if(api_params.query.length > 0)
          api_params.query += ' ' + parameter.andOr + ' ';

        if(parameter.operator == 'must_not')
          api_params.query += ' NOT ';

        api_params.query += parameter.memeType + ':[' + formatDate(parameter.startDate.toLocaleDateString()) + ' TO ' + formatDate(parameter.endDate.toLocaleDateString()) + ']';
      }
      else if(parameter.query && parameter.query.length > 0){
        if(api_params.query.length > 0)
          api_params.query += ' ' + parameter.andOr + ' ';

        if(parameter.operator == 'must_not')
          api_params.query += ' NOT ';

        api_params.query += parameter.memeType + ':' + parameter.query;
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
    $('#d3_script').replaceWith("<script src=\"javascripts/visualizations/" + $scope.viewType.toLowerCase() + ".js\" type=\"text/javascript\" id=\"d3_script\"></script>");
    $('#d3_style').replaceWith("<link href=\"stylesheets/visualizations/" + $scope.viewType.toLowerCase() + ".css\" rel=\"stylesheet\" type=\"text/css\" id=\"d3_style\">");
  }

})

.controller('detailsModalCtrl', function($scope, $modalInstance, files, addresses){
  $scope.addresses = addresses;
  $scope.files = files;
  // console.log(files);
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

.controller('adminCtrl', function($rootScope, $scope, $http, $modal, types){
  $scope.types = types;
  $scope.test = [];
  $scope.fields = ['test', 'blaa'];

  $scope.deleteMapping = function(type, index){
    if(confirm("Are you sure you want to delete the mapping '" + type + "'?")){
      $http.post('./api/delete_mapping', {type: type})
      .success(function(data){
        $scope.types.splice(index, 1);
      })
    }
  }

  $scope.openVisualizations = function(type){
    var modalInstance = $modal.open({
      templateUrl: 'views/modals/visualizations',
      controller: 'visualizationModalCtrl',
      size: 'lg',
      scope: $scope,
      resolve: {
        type: function() { return type; },
        visualizations: model.getVisualizations(type),
        fields: model.getMappingFields(type)
        // files: model.getFileDetails({hashids: data.hashids, type:$scope.searchType, tables: data.tables}),
        // addresses: function(){ return data.adressses; }
      }
    });

    modalInstance.opened.then(function(){
      $scope.loading = false;
    });

    modalInstance.result.then(function () {
      //closed
    }, function () {
      
    });
  }

  $scope.pauseFilling = function(type){
    socket.emit('pauseFilling', {type: type});
  }
})

.controller('mappingCtrl', function($scope, $http, $stateParams, $state, mapping, modules, types){
  // console.log(mapping);
  // console.log(modules);
  $scope.modules = modules;
  $scope.types = types;
  $scope.mapping = {name: $stateParams.type};
  $scope.mapping.selectedFields = {};
  $scope.selectedModules = [];

  $scope.models = {
    selected: null,
    lists:{
      fields: [],
      selectedFields: []
    }
  };

  if(mapping){
    mapping.forEach(function(table){
      table = table._source;

      var mime_type = table.mime_type;

      if($scope.selectedModules.indexOf(mime_type) == -1)
        $scope.selectedModules.push(mime_type);

      table.fields.split(',').forEach(function(field){
        if(field != 'hashid'){
          var found = false;
          for(var i in $scope.models.lists.selectedFields){
            if($scope.models.lists.selectedFields[i].field == field){
              found = true;
              if($scope.models.lists.selectedFields[i].modules.indexOf(mime_type) == -1){
                $scope.models.lists.selectedFields[i].modules.push(mime_type);
              }
            }
          }
          if(!found){
            $scope.models.lists.selectedFields.push({field: field, modules: [mime_type]});
          }         
        }
      });
    });
  }

  $scope.modulesList = {};
  for(var key in modules){
    $scope.modulesList[key.split('/')[0]] = $scope.modulesList[key.split('/')[0]] || [];
    $scope.modulesList[key.split('/')[0]].push(key);
  }

  $scope.reloadFields = function(){
    loadFields($scope.selectedModules);
  }

  $scope.$watch('selectedModules', loadFields);

  function loadFields(mime_types){
    $scope.models.lists.fields = [];
    if(mime_types && mime_types.length > 0){
      mime_types.forEach(function(mime_type){
        modules[mime_type].fields.forEach(function(field){
          var exists, selected;
          $scope.models.lists.selectedFields.forEach(function(item){
            if(item.field == field && item.modules.indexOf(mime_type) != -1){
              selected = true;
              return;
            }
          });
          $scope.models.lists.fields.forEach(function(item){
            if(item.field == field && !selected){
              item.modules.push(mime_type);
              exists = true;
              return;
            }
          });
          if(!exists && !selected)
            $scope.models.lists.fields.push({modules:[mime_type], field:field});
        });
      });
      $scope.models.lists.fields.forEach(function(item){
        // console.log(item.field + ':' + item.modules.length);
      }); 
      // console.log($scope.models);
    }
    // sort by module list length
    $scope.models.lists.fields.sort(function(a,b){
      return b.modules.length - a.modules.length;
    });
    // Sort by field name
    // $scope.models.lists.fields.sort(function(a,b){
    //   return a.field > b.field;
    // });

    $scope.models.lists.fields.forEach(function(field, index){
      if($scope.checkPresent(field)){
        ArrayMove($scope.models.lists.fields, index, 0);
      }
    });
    console.log($scope.models.lists.fields);
    $scope.selectFields = undefined;
  }

  $scope.selectField = function(event, index, item, type){
    $scope.models.lists.selectedFields.forEach(function(field, index){
      if(field.field == item.field){
        item.modules = item.modules.concat(field.modules);
        $scope.models.lists.selectedFields.splice(index, 1);
      }
    });
    return item;
  }

  $scope.addField = function(item){
    var exists = false;
    $scope.models.lists.selectedFields.forEach(function(field, index){
      if(field.field == item.field){
        field.modules = field.modules.concat(item.modules);
        return exists = true;
      }
    });
    if(!exists)
      $scope.models.lists.selectedFields.push(item);
  }

  $scope.checkSelected = function(){
    $scope.models.lists.selectedFields.forEach(function(field){
      field.modules.forEach(function(field){
        if($scope.selectedModules.indexOf(field) == -1)
          $scope.selectedModules.push(field);
      });
    }); 
  }

  $scope.checkPresent = function(item){
    var present = false;
    $scope.models.lists.selectedFields.forEach(function(field){
      if(field.field == item.field){
        present = true;
        return;
      }
    });
    return present;
  }

  $scope.checkForFields = function(type){
    for(var field in modules[type].fields){
      var field = modules[type].fields[field];
      if(field != 'hashid' && $scope.checkPresent({field: field})){
        return true;
      }
    }
    return false;
  }

  // $scope.$watch('selectFields', function(newVal){
  //   if(newVal && newVal.length > 0){
  //     newVal.forEach(function(item){
  //       var module = item.split(':')[0];
  //       var field = item.split(':')[1];
  //       if($scope.fields[module] && (!$scope.mapping.selectedFields[module] || $scope.mapping.selectedFields[module].indexOf(field) == -1)){
  //         $scope.mapping.selectedFields[module] = $scope.mapping.selectedFields[module] || [];
  //         $scope.mapping.selectedFields[module].push(field);
  //       }
  //     });
  //   }
  // }); 

  // $scope.$watch('deselectFields', function(newVal){
  //   if(newVal && newVal.length > 0){
  //     newVal.forEach(function(item){
  //       var module = item.split(':')[0];
  //       var field = item.split(':')[1];
  //       if($scope.mapping.selectedFields[module] && $scope.mapping.selectedFields[module].indexOf(field) != -1){
  //         $scope.mapping.selectedFields[module].splice($scope.mapping.selectedFields[module].indexOf(field), 1);
  //         if($scope.mapping.selectedFields[module].length ==0)
  //           delete $scope.mapping.selectedFields[module];
  //       }
  //     });
  //   }
  // });

  $scope.getSize = function(object){
    var count = 1;
    for(var key in object){
      count++;
      count+=object[key].length;
    }
    return count;
  }

  $scope.createMapping = function(){
    var mapping = {
      name: $scope.mapping.name,
      tables: {},
      fields: {},
      visualizations: $scope.mapping.visualizations
    }

    $scope.models.lists.selectedFields.forEach(function(field){
      mapping.fields[field.field] = field.modules;
      mapping.fields.hashid = (mapping.fields.hashid || []).concat(field.modules);
      field.modules.forEach(function(mime_type){

        for(var table in modules[mime_type].tables){
          if(modules[mime_type].tables[table].indexOf(field.field) != -1){
            mapping.tables[table] = mapping.tables[table] || {mime_type: mime_type, fields: ['hashid']};
            mapping.tables[table].fields.push(field.field);
          }
        }

      });
    });

    console.log(mapping);
    $http.post('./api/create_mapping', mapping)
    .success(function(res){
      console.log(res);
      $state.go('admin.overview');
    });
  }
})

.controller('visualizationModalCtrl', function($scope, $modalInstance, $http, type, fields, visualizations){
  $scope.mapping = {name: type};
  $scope.modalInstance = $modalInstance;
  $scope.fields = Object.keys(fields);

  $scope.fields.push('Count');

  $scope.visualizations = [];

  for(var key in visualizations){
    $scope.visualizations.push(visualizations[key]);
  }
  
  if($scope.visualizations.length == 0)
    $scope.visualizations.push({});

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

  $scope.save = function(){
    $http.post('/api/visualizations/save', {type: type, visualizations: $scope.visualizations})
    .success(function(data){
      if(!data.error){
        $modalInstance.close('saved');
      }
    });
  }
});

function ArrayMove(array, old_index, new_index) {
  if (new_index >= array.length) {
    var k = new_index - array.length;
    while ((k--) + 1) {
      array.push(undefined);
    }
  }
  array.splice(new_index, 0, array.splice(old_index, 1)[0]);
  return array; // for testing purposes
};
