
(function() {
    var mod = angular.module('mappings.create', []);

    mod.controller('MappingsCreateController', MappingsCreateController);

    function MappingsCreateController($scope, $http, $stateParams, $state, mapping, types) {
        console.log(mapping);
        console.log(types);
        $scope.mime_types = mime_types;
        $scope.types = types;
        $scope.mapping = {name: $stateParams.type};
        $scope.mapping.selectedFields = {};
        $scope.selectedMimetypes = [];
        $scope.selectedModules = [];
        $scope.modulesList = {};

        $scope.models = {
          selected: null,
          lists:{
            fields: [],
            selectedFields: []
          }
        };

        $scope.mimetypesList = {};
        var modules = {};
        for(var key in mime_types){
          $scope.mimetypesList[key.split('/')[0]] = $scope.mimetypesList[key.split('/')[0]] || [];
          $scope.mimetypesList[key.split('/')[0]].push(key);
          for(var module in mime_types[key].modules){
            modules[module] = mime_types[key].modules[module];
          }
        }

        $scope.modules = modules;

        function initMapping() {
          // console.log(mapping);
          mapping.forEach(function(table){
            table = table._source;

            var mime_types = table.mime_types;
            var modules = table.modules;

            mime_types.forEach(function(mime_type){
              if($scope.selectedMimetypes.indexOf(mime_type) == -1)
                $scope.selectedMimetypes.push(mime_type);
            });

            table.modules.forEach(function(module){
              if($scope.selectedModules.indexOf(module) == -1)
                $scope.selectedModules.push(module);
            });

            table.fields.forEach(function(field){
              if(field != 'hashid'){
                var found = false;
                for(var i in $scope.models.lists.selectedFields){
                  if($scope.models.lists.selectedFields[i].field == field){
                    found = true;
                    mime_types.forEach(function(mime_type){
                      if($scope.models.lists.selectedFields[i].modules.indexOf(mime_type) == -1){
                        $scope.models.lists.selectedFields[i].modules.push(mime_type);
                      }
                    });
                  }
                }
                if(!found){
                  $scope.models.lists.selectedFields.push({field: field, modules: modules, mime_types: mime_types});
                }
              }
            });
          });
          $scope.updateModulesList();
        };

        $scope.reloadFields = function(){
          loadFields($scope.selectedModules);
        }

        $scope.$watch('selectedModules', loadFields);

        function loadFields(input){
          $scope.models.lists.fields = [];
          if(input && input.length > 0){
            input.forEach(function(module){
              for(var mime_type in mime_types){
                if(mime_types[mime_type].modules[module]){
                  mime_types[mime_type].modules[module].fields.forEach(function(field){
                    var exists, selected;
                    $scope.models.lists.selectedFields.forEach(function(item){
                      if(item.field == field && item.modules.indexOf(module) != -1){
                        selected = true;
                        return;
                      }
                    });
                    $scope.models.lists.fields.forEach(function(item){
                      if(item.field == field && !selected){
                        item.modules.push(module);
                        exists = true;
                        return;
                      }
                    });
                    if(!exists && !selected)
                      $scope.models.lists.fields.push({modules:[module], field:field, mime_types: [mime_type]});
                  });
                }
              }
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
              // console.log(item);
              field.mime_types = field.mime_types.concat(item.mime_types);
              return exists = true;
            }
          });
          if(!exists)
            $scope.models.lists.selectedFields.push(item);
        }

        $scope.checkSelected = function(object, key){
          $scope.models.lists.selectedFields.forEach(function(field){
            field[key].forEach(function(item){
              if($scope[object].indexOf(item) == -1)
                $scope[object].push(item);
            });
          });
        }

        $scope.updateModulesList = function(){
          $scope.modulesList = {};
          $scope.selectedMimetypes.forEach(function(mime_type){
            $scope.modulesList[mime_type] = Object.keys(mime_types[mime_type].modules);
          });
          $scope.checkSelected('selectedMimetypes', 'mime_types');
          $scope.checkSelected('selectedModules', 'modules');
        }

        $scope.checkPresent = function(item, key){
          var present = false;
          $scope.models.lists.selectedFields.forEach(function(field){
            if(field.field == item.field){
              present = true;
              return;
            }
          });
          return present;
        }

        $scope.checkMimetypeForFields = function(type){
          for(var module in mime_types[type].modules){
            for(var field in mime_types[type].modules[module].fields){
              var field = mime_types[type].modules[module].fields[field];
              if(field != 'hashid' && $scope.checkPresent({field: field})){
                return true;
              }
            }
          }
          return false;
        }

        $scope.checkModuleForFields = function(module){
          for(var type in mime_types){
            if(mime_types[type].modules[module]){
              for(var field in mime_types[type].modules[module].fields){
                var field = mime_types[type].modules[module].fields[field];
                if(field != 'hashid' && $scope.checkPresent({field: field})){
                  return true;
                }
              }
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
            // console.log(field);
            mapping.fields[field.field] = field.modules;
            mapping.fields.hashid = (mapping.fields.hashid || []).concat(field.modules);
            field.modules.forEach(function(module){

              for(var table in modules[module].tables){
                if(modules[module].tables[table].indexOf(field.field) != -1){
                  mapping.tables[table] = mapping.tables[table] || {modules: field.modules, fields: ['hashid'], mime_types: field.mime_types};
                  mapping.tables[table].fields.push(field.field);
                }
              }

            });

          });

          // console.log(mapping);
          $http.post('./api/create_mapping', mapping)
              .success(function(res){
                console.log(res);
                $state.go('admin.overview');
              });
        }

        if(mapping)
          initMapping();
    }
})();
