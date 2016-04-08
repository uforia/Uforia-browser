var model = {

  getAvailableModules: ['$http', '$q', function($http, $q) {
    var defer = $q.defer();
  
    $http
      .post('api/get_modules')
      .success(function(data) {
        defer.resolve(data);
      });
  
    return defer.promise;
  }],
  getMapping: ['$http', '$q', '$stateParams', function($http, $q, $stateParams) {
    var defer = $q.defer();
  
    $http
      .post('api/get_mapping', {type: $stateParams.type})
      .success(function(data) {
        defer.resolve(data);
      });
  
    return defer.promise;
  }],
  getMappingFields: function(type) { 
    return ['$http', '$q', '$stateParams', function($http, $q, $stateParams) {
      var defer = $q.defer();
    
      $http
        .post('api/mapping_info', {type: type})
        .success(function(data) {
          defer.resolve(data);
        });
    
      return defer.promise;
    }] 
  },
  
   getVisualizations: function(type) {
        return ['$http', '$q', '$stateParams', function($http, $q, $stateParams) {
            var defer = $q.defer();

            $http
                .post('api/view_info?type=' + type)
                .success(function(data) {
                    defer.resolve(data);
                });

            return defer.promise;
        }]
    }

};