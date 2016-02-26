describe('SatellizerOauth2', function() {

  beforeEach(module('satellizer'));

  beforeEach(inject(function($httpBackend, $interval, SatellizerOauth2, SatellizerConfig) {
    this.$httpBackend = $httpBackend;
    this.$interval = $interval;
    this.oauth2 = new SatellizerOauth2();
    this.config = SatellizerConfig;
  }));

  describe('open()', function() {

    it('should be defined', function() {
      expect(this.oauth2.open).toBeDefined();
    });

    it('should start the oauth 2.0 flow', function() {
      //this.oauth2.open();
    });

  });

  describe('exchangeForToken()', function() {

    it('should be defined', function() {
      expect(this.oauth2.exchangeForToken).toBeDefined();
    });

    it('should exchange code for token', function() {
      this.oauth2.exchangeForToken('code=foo');
    });

    it('should exchange code for token with custom responseParams', function() {
      this.config.providers.facebook.responseParams = {
        code: 'code',
        client_id: 'clientId',
        redirect_uri: 'redirectUri',
        custom: 'custom'
      };
      this.oauth2.open(this.config.providers.facebook);
    });

    it('should handle state param', function() {
      this.oauth2.open(this.config.providers.facebook);
      this.oauth2.exchangeForToken({ state: 'STATE' });
    });

  });

  describe('buildQueryString()', function() {

    it('should be defined', function() {
      expect(this.oauth2.buildQueryString).toBeDefined();
    });

    it('should URI-encode state value', function() {
      this.oauth2.open({defaultUrlParams: ['state'], state: 'foo+bar'});
      expect(this.oauth2.buildQueryString()).toContain('state=foo%2Bbar');
    });

    it('should use scopePrefix if provided', function() {
      this.oauth2.open(this.config.providers.google);
      expect(this.oauth2.buildQueryString()).toContain('scope=openid profile email');
    });

    it('should remove redirect_uri if param redirectUrl is null', function() {
      var tempProvider = angular.copy(this.config.providers.google);
      tempProvider.redirectUri = null;
      this.oauth2.open(tempProvider);
      expect(this.oauth2.buildQueryString()).not.toContain('redirect_uri=');
    });

  });

});

