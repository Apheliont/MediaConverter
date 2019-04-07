const { workerModel } = require("../models/fileWorkerFusion");

function getWorkers(req, res) {
  try {
    const workers = workerModel.getWorkers();
    res.setHeader("Content-Type", "application/json");
    res.status(200).json(workers);
  } catch (e) {
    res.status(500).send(e.message);
  }
}

async function addWorker(req, res) {
  try {
    const autoConnect = Number(req.body.autoConnect) === 1 ? true : false;
    const data = Object.assign({}, req.body, { autoConnect });
    const id = await workerModel.addWorker(data);
    res.setHeader("Content-Type", "application/json");
    res.status(200).json({ id });
  } catch (e) {
    res.status(500).send(e.message);
  }
}

async function deleteWorker(req, res) {
  try {
    const id = Number(req.params.id);
    await workerModel.deleteWorker(id);
    res.status(200).end();
  } catch (e) {
    res.status(500).send(e.message);
  }
}

async function updateWorker(req, res) {
  try {
    const id = Number(req.params.id);
    const payload = req.body;
    await workerModel.updateWorker(id, payload);
    res.status(200).end();
  } catch(e) {
    res.status(500).send(e.message);
  }
}

function switchWorker(req, res) {
  try {
    const id = Number(req.params.id);
    const worker = workerModel.getWorkerById(id);
    if (worker) {
      if (worker.condition.status === 0) {
        worker.connect();
        res.status(200).end();
      } else if (worker.condition.status === 1) {
        worker.disconnect();
        res.status(200).end();
      }
    } else {
      res.status(500).end();
    }
  } catch(e) {
    res.status(500).send(e.message);
  }

}

module.exports = {
  getWorkers,
  addWorker,
  deleteWorker,
  updateWorker,
  switchWorker
};
