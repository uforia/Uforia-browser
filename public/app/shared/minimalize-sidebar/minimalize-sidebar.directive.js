(function () {
    /**
     * minimalizaSidebar - Directive for minimalize sidebar
    */

    var mod = angular.module('minimalizeSidebar', minimalizaSidebar);
    
    function minimalizaSidebar($timeout) {
        return {
            restrict: 'A',
            template: '<a class="navbar-minimalize minimalize-styl-2 btn btn-primary " href="" ng-click="minimalize()"><i class="fa fa-bars"></i></a>',
            controller: 'minimalizeSidebarController'
        };
    }
})();