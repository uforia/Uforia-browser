angular.module('uforia')

.filter('selectedFirst', function() {
  return function(list, model) {
  	console.log(model);
  	// list.sort(function(a, b){
  		
  	// });
    return list;
  };
})

.filter('percentage', function ($window) {
  return function (input, decimals, suffix) {
      decimals = angular.isNumber(decimals)? decimals :  3;
      suffix = suffix || '%';
      if ($window.isNaN(input) || !$window.isFinite(input)) {
          return '';
      }
      return (Math.round(input * Math.pow(10, decimals + 2))/Math.pow(10, decimals)).toFixed(decimals) + suffix
  };
})