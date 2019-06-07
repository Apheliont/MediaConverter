const Merge = require("../processors/merge");
const settings = require("../settings");
const io = require("../socket.io-server");

module.exports = async function({ file, worker_timerID, file_timerID }) {
  // деструктуризуем данные в объекте file
  const { id, fileName, sourcePath, category } = file;
  try {
    if (
      settings.workerID === undefined ||
      settings.totalPhysicalCores === 0 ||
      settings.tempFolderName === undefined
    ) {
      return Promise.reject(
        "Состояние воркера не позволяет обрабатывать файлы"
      );
    }

    // подтверждаем получение данных
    // мы не меняем статус файла на 2 т.к он уже сменен в функции lockFile
    io.emit("workerResponse", {
      acknowledgement: {
        worker_timerID,
        file_timerID,
        fileID: id
      }
    });

    const destinationPath = settings.categories.find(
      cat => cat.id === Number(category)
    ).path;

    const merge = new Merge({
      id,
      fileName,
      sourcePath,
      destinationPath
    });

    await merge.merge();
    // если всё ок, то отправляем на сервер инфу что у файла изменился stage
    io.emit("workerResponse", {
      fileInfo: {
        id,
        parts: 1,
        status: 0
      }
    });
  } catch (e) {
    // если ошибка связана с отменой файла то это ОК, не пробрасываем ее дальше
    if (e.message && e.message.split(" ").includes("SIGKILL")) {
      io.emit("workerResponse", {
        fileInfo: {
          id,
          parts: 1,
          status: 4
        }
      });
    } else {
      io.emit("workerResponse", {
        fileInfo: {
          id,
          parts: 1,
          status: 1,
          errorMessage: `Обработчик №: ${
            settings.workerID
          }\nЭтап: Слияние\n${e}`
        }
      });
    }
  }
};
