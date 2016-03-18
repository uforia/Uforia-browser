(function () {

    /**
     * pageTitle - Directive for set Page title - meta title
     */

    var mod = angular.module('pageTitle', []);

    mod.directive('pageTitle', pageTitle);

    function pageTitle($rootScope, $timeout) {
        return {
            restrict: 'A',
            link: function (scope, element) {
                var listener = function (event, toState, toParams, fromState, fromParams) {
                    // Default title - load on Dashboard 1
                    var title = 'Uforia | Dashboard';
                    // Create your own title pattern
                    if (toState.data && toState.data.pageTitle) title = 'Uforia | ' + toState.data.pageTitle;
                    $timeout(function () {
                        element.text(title);
                    });
                };
                $rootScope.$on('$stateChangeStart', listener);
            }
        }
    }
})();