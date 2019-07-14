const watcherModel = require("../models/watcher");

function getWatchers(req, res) {
  try {
    const watchers = watcherModel.getWatchers();
    res.setHeader("Content-Type", "application/json");
    res.status(200).json(watchers);
  } catch (e) {
    res.status(500).send(e.message);
  }
}

async function addWatcher(req, res) {
  try {
    const id = await watcherModel.addWatcher(req.body);
    res.setHeader("Content-Type", "application/json");
    res.status(200).json({ id });
  } catch (e) {
    res.status(500).send(e.message);
  }
}

async function deleteWatcher(req, res) {
  try {
    const id = Number(req.params.id);
    await watcherModel.deleteWatcher(id);
    res.status(200).end();
  } catch (e) {
    res.status(500).send(e.message);
  }
}

async function updateWatcher(req, res) {
  try {
    const id = Number(req.params.id);
    const payload = {
      host: req.body.host,
      port: Number(req.body.port)
    };
    await watcherModel.updateWatcher(id, payload);
    res.status(200).end();
  } catch (e) {
    res.status(500).send(e.message);
  }
}

function switchWatcher(req, res) {
  try {
    const id = Number(req.params.id);
    const watcher = watcherModel.getWatcherById(id);
    if (watcher) {
      if (watcher.status === 0) {
        watcher.connect();
        res.status(200).end();
      } else {
        watcher.disconnect();
        res.status(200).end();
      }
    }
  } catch (e) {
    res.status(500).send(e.message);
  }
}

module.exports = {
  getWatchers,
  addWatcher,
  deleteWatcher,
  updateWatcher,
  switchWatcher
};
