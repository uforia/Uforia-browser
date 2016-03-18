(function () {
    /**
     * sideNavigation - Directive for run metsiMenu on sidebar navigation
     */

    var mod = angular.module('sideNavigation', []);

    mod.directive('sideNavigation', sideNavigation());

    function sideNavigation($timeout) {
        return {
            restrict: 'A',
            link: function (scope, element) {
                // Call the metsiMenu plugin and plug it to sidebar navigation
                $timeout(function () {
                    element.metisMenu();
                });
            }

        };
    }


})();