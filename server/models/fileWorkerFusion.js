const fileModel = require("./file");
const workerModel = require("./worker");

//------------------------------------------
// Обмен методами между классами

fileModel.addMethod(
  "getWorkerById",
  workerModel.getWorkerById.bind(workerModel)
);
fileModel.addMethod(
  "getAnyOperationalWorker",
  workerModel.getAnyOperationalWorker.bind(workerModel)
);
workerModel.addMethod("getFileById", fileModel.getFileById.bind(fileModel));
workerModel.addMethod("releaseFiles", fileModel.releaseFiles.bind(fileModel));
workerModel.addMethod(
  "updateFileProgressById",
  fileModel.updateFileProgressById.bind(fileModel)
);
workerModel.addMethod(
  "getPendingFiles",
  fileModel.getPendingFiles.bind(fileModel)
);
workerModel.addMethod("updateFile", fileModel.updateFile.bind(fileModel));

module.exports = {
  fileModel,
  workerModel
};
