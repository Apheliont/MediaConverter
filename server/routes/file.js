const express = require('express');
const router = express.Router();
const fileController = require('../controllers/file');
const multer = require('../multer');

router.post('/upload', multer.init, fileController.uploadFile);
router.get('/', fileController.getFiles);
router.delete('/:id', fileController.deleteFile);

module.exports = router;