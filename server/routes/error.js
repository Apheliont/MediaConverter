const express = require('express');
const router = express.Router();
const { getError } = require('../controllers/error');

router.get('/:id', getError);

module.exports = router;