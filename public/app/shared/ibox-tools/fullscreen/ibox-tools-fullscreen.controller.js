(function () {
    var mod = angular.module('iboxToolsFullScreen');

    mod.controller('iboxToolsFullscreen', iboxToolsFullscreen);

    function iboxToolsFullscreen($scope, $element) {
        // Function for collapse ibox
        $scope.showhide = function () {
            var ibox = $element.closest('div.ibox');
            var icon = $element.find('i:first');
            var content = ibox.find('div.ibox-content');
            content.slideToggle(200);
            // Toggle icon from up to down
            icon.toggleClass('fa-chevron-up').toggleClass('fa-chevron-down');
            ibox.toggleClass('').toggleClass('border-bottom');
            $timeout(function () {
                ibox.resize();
                ibox.find('[id^=map-]').resize();
            }, 50);
        };
        // Function for close ibox
        $scope.closebox = function () {
            var ibox = $element.closest('div.ibox');
            ibox.remove();
        };
        // Function for full screen
        $scope.fullscreen = function () {
            var ibox = $element.closest('div.ibox');
            var button = $element.find('i.fa-expand');
            $('body').toggleClass('fullscreen-ibox-mode');
            button.toggleClass('fa-expand').toggleClass('fa-compress');
            ibox.toggleClass('fullscreen');
            setTimeout(function () {
                $(window).trigger('resize');
            }, 100);
        }
    }
})();