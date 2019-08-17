const { fileModel, workerModel } = require("./models/fileWorkerFusion");
const { informClients } = require("./socket.io-server");
const sendFileInfo = informClients("FILEINFO");
const sendWorkerInfo = informClients("WORKERINFO");


const updater = createUpdater(fileModel);

// **** обработчики на модель файла ****
fileModel.on("updateProgress", () => {
  updater();
});

fileModel.on("addFile", fileData => {
  sendFileInfo("ADDFILE", fileData);
});

fileModel.on("deleteFile", id => {
  sendFileInfo("DELETEFILE", id);
});

fileModel.on("updateFile", data => {
  sendFileInfo("UPDATEFILE", data);
});

// **** обработчики на модель воркера ****
workerModel.on("workerInfo", data => {
  sendWorkerInfo("WORKERINFO", data);
});

function createUpdater(fileModel) {
  const TIME_INTERVAL = 300; // интервал отсылки данных на клиентов(мс)
  let timerID = null;
  return function helper() {
    if (timerID !== null) return;
    timerID = setInterval(() => {
      if (!checkUpdateNecessity(fileModel)) {
        clearInterval(timerID);
        timerID = null;
      }
      sendFileInfo("UPDATEPROGRESS", prepareProgressData(fileModel));
    }, TIME_INTERVAL);
  };
}

// проверяем чтобы хотябы 1 файл был в состоянии "в процессе"
// а иначе нет смысла отсылать инфу на клиент об обновлении прогресса
function checkUpdateNecessity(fileModel) {
  const files = fileModel.getFiles();
  for (const file of files) {
    if (file.status === 2) return true;
  }
  return false;
}
function prepareProgressData(fileModel) {
  const result = {}; // key - fileID<int>, value - totalPercent<int>
  const files = fileModel.getFiles();
  for (const file of files) {
    if (file.status === 2) {
      result[file.id] = file.totalPercent;
    }
  }
  return result;
}
