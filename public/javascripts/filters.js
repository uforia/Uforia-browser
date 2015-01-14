angular.module('uforia')

.filter('selectedFirst', function() {
  return function(list, model) {
  	console.log(model);
  	// list.sort(function(a, b){
  		
  	// });
    return list;
  };
})