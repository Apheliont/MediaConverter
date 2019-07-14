const { fileModel, workerModel } = require("../models/fileWorkerFusion");

async function uploadFile(req, res) {
  try {
    await fileModel.addFile(req.body);
    // запускаем процесс попытки кодирования
    workerModel.tryProcessNext();
  } catch (e) {
    res.status(500).send(e.message);
  }
  res.status(200).end();
}


function getFiles(req, res) {
  const files = fileModel.getFiles();
  const filteredData = files.map(file => file.filterFileData());
  res.status(200).json(filteredData);
}

function deleteFile(req, res) {
  const id = Number(req.params.id);
  fileModel.deleteFileById(id);
  res.status(200).end();
}

module.exports = {
  uploadFile,
  getFiles,
  deleteFile
};
