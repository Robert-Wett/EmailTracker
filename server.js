/**
 * Module dependencies.
 */


var methodOverride = require('method-override');
var bodyParser     = require('body-parser');
var express        = require('express');
var connect        = require('connect');
var routes         = require('./routes');
var http           = require('http');
var path           = require('path');


var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(connect.logger());
app.use(bodyParser.urlencoded({extended: true}));
app.use(methodOverride());
app.use(express.static(path.join(__dirname, 'docs')));

if ('development' == app.get('env')) {
  app.use(connect.errorHandler());
}

app.get('/img',              routes.imageLoad);
app.get('/user',             routes.createUser);
app.get('/list',             routes.list);
app.get('/create',           routes.createCampaignEmail);
app.get('/result',           routes.result);
app.get('/campaign',         routes.createCampaign);
app.get('/clearCollections', routes.clearCollections);
app.get('*',                 routes.nonRoute);

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
