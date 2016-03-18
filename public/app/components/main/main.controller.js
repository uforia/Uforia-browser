(function() {
    var mod = angular.module('main', []);

    mod.controller('MainController', MainController);

    function MainController() {
        
        var vm = this;
        vm.userName = 'Example user';
        vm.helloText = 'Welcome in SeedProject';
        vm.descriptionText = 'It is an application skeleton for a typical AngularJS web app. You can use it to quickly bootstrap your angular webapp projects and dev environment for these projects.';

    }
})();