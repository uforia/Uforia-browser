(function () {
    /**
     * iboxTools with full screen - Directive for iBox tools elements in right corner of ibox with full screen option
     */

    var mod = angular.module('iboxToolsFullScreen', []);

    mod.directive('iboxToolsFullScreen', iboxToolsFullScreen);

    function iboxToolsFullScreen($timeout) {
        return {
            restrict: 'A',
            scope: true,
            templateUrl: 'app/shared/ibox-tools/fullscreen/ibox-tools-fullscreen.view.html',
            controller: 'iboxToolsFullScreenController'
        };
    }


})();