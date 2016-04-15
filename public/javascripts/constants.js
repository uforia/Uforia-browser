(function() {
    'use strict';

    angular
        .module('uforia')
        .constant('ROLES',
            {
                admin: 'admin',
                manager: 'manager',
                user: 'user'
            })
        .constant('USER_ROLES',
            {
                teamLeader: 'Team leader',
                evidenceOfficer: 'Evidence officer',
                evidenceSearcher: 'Evidence searcher',
                photographer: 'Photographer'
            });
})();