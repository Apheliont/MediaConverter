const { fileModel, workerModel } = require("./models/fileWorkerFusion");
const { informClients } = require("./socket.io-server");
const sendFileInfo = informClients("FILEINFO");
const sendWorkerInfo = informClients("WORKERINFO");

// кэш для хранения данных файлов для дальнейшей отправки на фронтэнд
// key - fileID<int>, value - filteredFileData<Object>
// Map выбрана из-за наличия метода clear
const fileDataToSend = new Map();
// кэш для хранения прогресса кодирования
// key - fileID<int>, value - progress<int>
const fileProgressToSend = new Map();


const updater = createUpdater(fileModel);

// **** обработчики на модель файла ****
fileModel.on("updateProgress", data => {
    if ("id" in data) {
      fileProgressToSend.set(data.id, data)
      updater();
    }
});

fileModel.on("addFile", fileData => {
  sendFileInfo("ADDFILE", fileData);
});

fileModel.on("deleteFile", id => {
  sendFileInfo("DELETEFILE", id);
});

fileModel.on("updateFile", data => {
  if ("id" in data) {
    fileDataToSend.set(data.id, data)
    updater();
  }
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
      sendFileInfo("UPDATEFILES", prepareProgressData(fileModel));
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
// возвращает объект где ключи это fileID а значения это объекты
// с данными файлов
function prepareProgressData(fileModel) {
  const result = {};
  // склеиваем данные о прогрессе и данные об изменении состояния файлов
  // берем любую Map из 2х, не важно какая из них содержит больше элементов
  for (const [key, val] of fileDataToSend) {
    if (fileProgressToSend.has(key)) {
      result[key] = Object.assign({}, val, fileProgressToSend.get(key));
      fileProgressToSend.delete(key);
    } else {
      result[key] = (Object.assign({}, val));
    }
  }
  // добавляем оставшиеся данные из 2й map
  for (const [key, val] of fileProgressToSend) {
    result[key] = (Object.assign({}, val));
  }
  // очищаем кэш
  fileDataToSend.clear();
  fileProgressToSend.clear();
  return result;
}
