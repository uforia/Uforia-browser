var express = require('express');
var passport = require('passport');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res) {
  res.render('index', { title: 'Uforia ElasticSearch Front-End' });
});

router.get('/logged-in', function(req, res) {
	res.send(req.isAuthenticated() ? '1' : '0');
});

router.post('/auth', passport.authenticate('local'), function(req, res) {
	res.send(req.user);
});

router.post('/logout', function(req, res){
	req.logOut();
	res.send(200);
});

module.exports = router;
