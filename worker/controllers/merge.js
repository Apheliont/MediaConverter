const Merge = require("../processors/merge");
const settings = require("../settings");
const io = require("../socket.io-server");
const path = require("path");
const fs = require("fs");
const fsPromise = fs.promises;

module.exports = async function({ file, worker_timerID, file_timerID }) {
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
        fileID: file.id
      }
    });

    // создаем папку для промежуточного хранения готового результата
    // Это хак для увеличения скорости получения итого откодированного
    // файла. Сначало готовый результат складывается на быструю ФС
    // а уже от туда копируется в место назначения
    await fsPromise.mkdir(path.join(file.tempRootPath, "final"));

    const finalInTemp = path.join(
      file.tempRootPath,
      "final",
      `${file.fileName}${file.destinationFormat}`
    );

    const destinationFile = path.join(
      settings.categories.find(cat => cat.id === Number(file.category)).path,
      `${file.fileName}${file.destinationFormat}`
    );

    // воссоздаем названия файлов которые мы будем склеивать
    const filesArr = [];
    for (let i = 1; i <= file.numberOfParts; i++) {
      filesArr.push(
        `${file.fileName}${file.partSuffix}${i}${file.destinationFormat}`
      );
    }

    // инъектим данные в объект файл и отправляем его дальше
    file.sourcePath = path.join(file.tempRootPath, "parts");
    file.finalInTemp = finalInTemp;
    file.filesToMerge = `concat:${filesArr.join("|")}`;

    const merge = new Merge(file);
    await merge.start();

    // копируем файл из промежуточной папки в финальную дирректорию
    io.emit("workerResponse", {
      fileInfo: {
        id: file.id,
        stage: 3
      }
    });
    await fsPromise.copyFile(finalInTemp, destinationFile);
    // если всё ок, то отправляем на сервер инфу что у файла изменился stage
    io.emit("workerResponse", {
      fileInfo: {
        id: file.id,
        status: 0
      }
    });
  } catch (e) {
    // если ошибка связана с отменой файла то это ОК, не пробрасываем ее дальше
    if (!(e.message && e.message.split(" ").includes("SIGKILL"))) {
      io.emit("workerResponse", {
        fileInfo: {
          id: file.id,
          status: 1,
          errorMessage: `Обработчик №: ${
            settings.workerID
          }\nЭтап: Слияние\n${e}`
        }
      });
    }
  }
};
