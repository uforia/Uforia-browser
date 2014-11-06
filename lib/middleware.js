var c 	= require('./common');


exports.init = function(req, res, next) {
  res.locals.config = c.config;  
  next();
}