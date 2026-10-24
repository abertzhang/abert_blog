const express = require('express');
const swaggerUi = require("swagger-ui-express");
const router = express.Router();

/* GET users listing. */
/**
 * @swagger
 */
router.get('/user', function(req, res, next) {
  res.send('respond with a resource');
});

module.exports = router;
