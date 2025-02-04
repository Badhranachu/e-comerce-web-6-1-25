var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const bodyParser = require('body-parser');
const multer = require('multer');
const exphbs = require('express-handlebars'); // Import express-handlebars
var app = express();
const fileUpload = require('express-fileupload');
var db = require('./config/connection');
const Handlebars = require('handlebars'); // Import Handlebars
const allowInsecurePrototypeAccess = require('@handlebars/allow-prototype-access').allowInsecurePrototypeAccess;
var session = require('express-session');

// Register Handlebars JSON helper
Handlebars.registerHelper("json", function (context) {
  return JSON.stringify(context);
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.engine(
  'hbs',
  exphbs.engine({
    extname: 'hbs',
    defaultLayout: 'layout',
    layoutsDir: __dirname + '/views/layout/',
    partialsDir: __dirname + '/views/partials/',
    handlebars: allowInsecurePrototypeAccess(Handlebars), // Allow prototype access
  })
);
app.set('view engine', 'hbs');  // Set view engine to 'hbs'

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(fileUpload());
app.use('/profile-images', express.static(path.join(__dirname, 'public/profile-images')));
app.use(session({ secret: "key", resave: false, saveUninitialized: true, cookie: { maxAge: 6000000 } }));

// Database connection
db.connect((err) => {
  if (err) console.log("db error" + err);
  else console.log("db connected");
});

// Body parser setup
app.use(bodyParser.urlencoded({ extended: true }));

// Routes setup
var userRouter = require('./routes/user');
var adminRouter = require('./routes/admin');
var clientRouter = require('./routes/client');
app.use('/', userRouter);
app.use('/admin', adminRouter);
app.use('/client', clientRouter);

// Error handler
app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
