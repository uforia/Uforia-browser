(function () {
    angular.module('uforia', [
        'ui.router', // Routing
        'oc.lazyLoad', // ocLazyLoad
        'ui.bootstrap', // Ui Bootstrap
        'main',
        'users',
        'mappings',
        'authentication',
        'search',
        'pageTitle',
        'sideNavigation',
        'minimalizeSidebar',
        'iboxTools',
        'iboxToolsFullScreen',
        'dndLists',
        'ui',
        'ui.select'
    ]);
})();
