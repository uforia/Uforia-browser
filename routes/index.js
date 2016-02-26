var express = require('express');
var passport = require('passport');
var router = express.Router();

router.get('/views/*', function(req, res) {
  res.render(req.path.replace('/views/', ''));
});

/* GET home page. */
router.get('/', function(req, res) {
  res.render('index', { title: 'Uforia ElasticSearch Front-End' });
});

router.get('/logged-in', function(req, res) {
	res.send(req.isAuthenticated() ? req.user : '0');
});

router.post('/auth', passport.authenticate('local'), function(req, res) {
	res.send(req.user);
});

router.post('/logout', function(req, res){
	req.logOut();
	res.send(200);
});

module.exports = router;
