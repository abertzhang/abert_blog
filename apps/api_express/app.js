const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = swaggerJsdoc({
  definition:{
    openapi:'3.0.0',
    info:{title:'Blog API Documentation',version:'1.0.0'},
  },
  apis:['./routes/*.js'],
})
const indexRouter = require('./routes/index');
const usersRouter = require('./routes/userRouter');

const app = express();
const articleRouter = require('./routes/articleRouter');
const userRouter = require('./routes/userRouter');
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use('/api-docs',swaggerUi.serve,swaggerUi.setup(swaggerSpec));
app.use(logger('dev'));
app.use(articleRouter)
app.use(userRouter)
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/', indexRouter);
app.use('/users', usersRouter);
// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
