const express = require('express');
const router = express.Router();
const workerController = require('../controllers/worker');

router.get("/", workerController.getWorkers);
router.post("/", workerController.addWorker);
router.put("/:id/switch", workerController.switchWorker);
router.delete("/:id", workerController.deleteWorker);
router.put("/:id", workerController.updateWorker);

module.exports = router;