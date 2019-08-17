const fwpathModel = require("../models/fwpath");

async function getFWPaths(req, res) {
  try {
    const fwpaths = await fwpathModel.getFWPaths();
    res.setHeader("Content-Type", "application/json");
    res.status(200).json(fwpaths);
  } catch (e) {
    res.status(500).send(e.message);
  }
}

async function addFWPath(req, res) {
  try {
    const id = await fwpathModel.addFWPath(req.body);
    res.status(200).json({
      id
    });
  } catch (e) {
    res.status(500).send(e.message);
  }
}

async function deleteFWPath(req, res) {
  const id = Number(req.params.id);
  try {
    await fwpathModel.deleteFWPath(id);
    res.status(200).end();
  } catch (e) {
    res.status(500).send(e.message);
  }
}

async function updateFWPath(req, res) {
  try {
    await fwpathModel.updateFWPath(req.body);
    res.status(200).end();
  } catch (e) {
    res.status(500).send(e.message);
  }
}

module.exports = {
  getFWPaths,
  addFWPath,
  deleteFWPath,
  updateFWPath
};