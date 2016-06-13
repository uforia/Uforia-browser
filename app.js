var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var c = require('./lib/common.js');
var debug = require('debug')('Uforia-browser-new');
var cors = require('cors');
var session = require('express-session');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var bcrypt = require('bcrypt-nodejs');

var routes = require('./routes/index');
var api = require('./routes/api'),
  m = require('./lib/middleware.js');


var app = express();

app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());
app.use(session({ secret: 'keyboard cat' }));
app.use(passport.initialize());
app.use(passport.session());

var auth = function (req, res, next) {
  if (!req.isAuthenticated()) {
    res.send(401);
  }
  else {
    next();
  }
}

app.use('/', m.init, routes);
app.use('/api', auth, api);

passport.serializeUser(function (user, done) {
  done(null, user);
});

passport.deserializeUser(function (user, done) {
  done(null, user);
});

passport.use(new LocalStrategy(
  function (username, password, done) {
    c.elasticsearch.search({
      index: c.config.elasticsearch.index,
      type: 'users',
      size: 1,
      body: {
        query: {
          filtered: {
            filter: {
              term: {
                email: username
              }
            }
          }
        }
      }
    }).then(function (response) {
      if (response.hits.total == 1) {
        var user = response.hits.hits[0]._source;
        user.id = response.hits.hits[0]._id;
        if (user['email'] === username && bcrypt.compareSync(password, user['password'])) {
          delete user.password;
          done(null, user);
          return;
        }
      }
      done(null, false, { error: 'Incorrect password.' });
    });
  }
));

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
// if (app.get('env') === 'development') {
//     app.use(function(err, req, res, next) {
//         console.error(err);
//         res.status(err.status || 500);
//         res.render('error', {
//             message: err.message,
//             error: err
//         });
//     });
// }

// // production error handler
// // no stacktraces leaked to user
// app.use(function(err, req, res, next) {
//     res.status(err.status || 500);
//     res.render('error', {
//         message: err.message,
//         error: {}
//     });
// });


module.exports = app;
