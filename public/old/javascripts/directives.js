angular.module('uforia')

.directive('ngSize', function(){
    return {
        restrict: 'A',
        link: function(scope,element,attrs){
            if(!element.nodeName === 'SELECT'){
                return;
            }
            attrs.$observe('ngSize', function setSize(value){
                attrs.$set('size', attrs.ngSize);   
            });
        }
    }
})
.directive('navigation', function(){
    return {
        restrict: 'E',
        templateUrl: 'views/nav.html',
        controller: 'navCtrl',
        controllerAs: 'ctrl'
    }
})
.directive('compareTo', function(){
    return {
        require: "ngModel",
        scope: {
            otherModelValue: "=compareTo"
        },
        link: function(scope, element, attributes, ngModel) {

            ngModel.$validators.compareTo = function(modelValue) {
                return modelValue == scope.otherModelValue;
            };

            scope.$watch("otherModelValue", function() {
                ngModel.$validate();
            });
        }
    };
});
