const express = require('express');
const router = express.Router();
const watcherController = require('../controllers/watcher');

router.get("/", watcherController.getWatchers);
router.post("/", watcherController.addWatcher);
router.put("/:id/switch", watcherController.switchWatcher);
router.delete("/:id", watcherController.deleteWatcher);
router.put("/:id", watcherController.updateWatcher);

module.exports = router;