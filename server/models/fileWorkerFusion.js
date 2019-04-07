const fileModel = require('./file');
const workerModel = require('./worker');

//------------------------------------------
// Обмен методами между классами

fileModel.addMethod('getWorkerById', workerModel.getWorkerById.bind(workerModel));

workerModel.addMethod('changeStatus', fileModel.changeStatus.bind(fileModel));
workerModel.addMethod('getFiles', fileModel.getFiles.bind(fileModel));
workerModel.addMethod('getPendingFile', fileModel.getPendingFile.bind(fileModel));
workerModel.addMethod('updateFile', fileModel.updateFile.bind(fileModel));

module.exports = {
    fileModel,
    workerModel
}

