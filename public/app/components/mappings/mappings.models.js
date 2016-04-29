/**
 * Global functions for mappings.
 */
var mappings = {
    getAvailableModules: ['$http', '$q', function($http, $q) {
        var defer = $q.defer();

        $http
          .post('api/get_modules')
          .success(function(data) {
            defer.resolve(data);
          });

        return defer.promise;
    }],
    getTypes: ['$http', '$q', function($http, $q) {
        var defer = $q.defer();

        $http
            .post('api/get_types')
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
  }


};
