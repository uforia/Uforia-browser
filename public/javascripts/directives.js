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
});