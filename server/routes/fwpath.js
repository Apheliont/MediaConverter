const express = require('express');
const router = express.Router();
const fwpathController = require('../controllers/fwpath');

router.get("/", fwpathController.getFWPaths);
router.post("/", fwpathController.addFWPath);
router.delete("/:id", fwpathController.deleteFWPath);
router.put("/:id", fwpathController.updateFWPath);

module.exports = router;