var model = {

  getTypes: ['$http', '$q', function($http, $q) {
    var defer = $q.defer();
  
    $http
      .post('api/get_types')
      .success(function(data) {
        defer.resolve(data);
      });
  
    return defer.promise;
  }],
  getFileDetails: function getFileDetails(data){ 
    return ['$http', '$q', function($http, $q) {
      var defer = $q.defer();

      $http
        .post('api/get_file_details', data)
        .success(function(data) {
        defer.resolve(data);
      });

      return defer.promise;
    }];
  }

};