(function() {
    'use strict';

    angular
        .module('uforia')
        .constant('ROLES',
            [
                {id: 0, name: 'Admin'},
                {id: 1, name: 'Manager'},
                {id: 2, name: 'User'}
            ])
        .constant('USER_ROLES',
            [
                {id: 0, name: 'Team leader'},
                {id: 1, name: 'Evidence officer'},
                {id: 2, name: 'Evidence searcher'},
                {id: 3, name: 'Photographer'}
            ]);
})();