const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settings');

router.get('/', settingsController.getSettings);
router.post('/', settingsController.setSettings);

module.exports = router;