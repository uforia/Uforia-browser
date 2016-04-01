(function () {
    angular.module('uforia', [
        'ui.router', // Routing
        'oc.lazyLoad', // ocLazyLoad
        'ui.bootstrap', // Ui Bootstrap
        'main',
        'users',
        'authentication',
        'pageTitle',
        'sideNavigation',
        'minimalizeSidebar',
        'iboxTools',
        'iboxToolsFullScreen'
    ]);
})();
