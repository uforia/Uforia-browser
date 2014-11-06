var express = require('express');
var router = express.Router();

router.get('/views/*', function(req, res) {
  res.render(req.path.replace('/views/', ''));
});

/* GET home page. */
router.get('/', function(req, res) {
  res.render('index', { title: 'Uforia ElasticSearch Front-End' });
});

module.exports = router;
