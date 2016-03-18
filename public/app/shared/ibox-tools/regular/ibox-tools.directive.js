(function () {
    /**
     * iboxTools - Directive for iBox tools elements in right corner of ibox
     */

    var mod = angular.module('iboxTools', []);

    mod.directive('iboxTools', iboxTools);

    function iboxTools($timeout) {
        return {
            restrict: 'A',
            scope: true,
            templateUrl: 'app/shared/ibox-tools/regular/ibox-tools.view.html',
            controller: 'iboxToolsController'
        };
    }

})();