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