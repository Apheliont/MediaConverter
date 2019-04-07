const { fileModel, workerModel } = require("../models/fileWorkerFusion");
let { informClients } = require("../socket.io-server");
informClients = informClients("FILEINFO");

async function uploadFile(req, res) {
  try {
    const id = await fileModel.addFile(req.body);
    // сразу оповещаем фронтенд новым файлом
    informClients("ADDFILE", fileModel.getFileById(id));
    // пытаемся начать кодирование если есть свободный воркер
    const idleWorker = workerModel.getIdleWorker();
    if (idleWorker) {
      const pendingFile = fileModel.getPendingFile();
      if (pendingFile) {
        idleWorker.transcode(pendingFile);
      }
    }
  } catch (e) {
    res.status(500).send(e.message);
  }
  res.status(200).end();
}

// API для стороннего микросервиса
async function watched(req, res) {
  try {
    const id = await fileModel.addFile(req.body);
    // сразу оповещаем фронтенд новым файлом
    informClients("ADDFILE", fileModel.getFileById(id));
    // пытаемся начать кодирование если есть свободный воркер
    const idleWorker = workerModel.getIdleWorker();
    if (idleWorker) {
      const pendingFile = fileModel.getPendingFile();
      if (pendingFile) {
        idleWorker.transcode(pendingFile);
      }
    }
  } catch (e) {
    res.status(500).send(e.message);
  }
  res.status(200).end();
}


function getFiles(req, res) {
  const files = fileModel.getFiles();
  res.status(200).json(files);
}

function deleteFile(req, res) {
  const id = Number(req.params.id);
  fileModel.deleteFileById(id);
  res.status(200).end();
}

module.exports = {
  watched,
  uploadFile,
  getFiles,
  deleteFile
};
