const merge = require("../processors/merge");
const settings = require("../settings");
const io = require("../socket.io-server");
const path = require("path");
const fs = require("fs");
const fsPromise = fs.promises;

module.exports = async function ({ file, worker_timerID, file_timerID }) {
  const { id, fileName, category, tempRootPath, partSuffix, numberOfParts } = file;
  try {
    if (
      settings.workerID === undefined ||
      settings.totalPhysicalCores === 0 ||
      settings.tempFolderName === ""
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
    const preset = settings.getPreset(category);
    const outputFormat = preset.O_FORMAT;
    // создаем папку для промежуточного хранения готового результата
    // Это хак для увеличения скорости получения итого откодированного
    // файла. Сначала готовый результат складывается на быструю ФС
    // а уже от туда копируется в место назначения
    await fsPromise.mkdir(path.join(tempRootPath, "final"));

    const finalInTemp = path.join(
      tempRootPath,
      "final",
      `${fileName}${outputFormat}`
    );

    const outputFile = path.join(
      settings.categories.find(cat => cat.id === Number(category)).path,
      `${fileName}${outputFormat}`
    );

    // воссоздаем названия файлов которые мы будем склеивать
    const filesArr = [];
    for (let i = 1; i <= numberOfParts; i++) {
      filesArr.push(
        `${fileName}${partSuffix}${i}${outputFormat}`
      );
    }

    // инъектим данные в объект файл и отправляем его дальше
    file.sourcePath = path.join(tempRootPath, "parts");
    file.finalInTemp = finalInTemp;
    file.input = `concat:${filesArr.join("|")}`;

    await merge({ preset, file });

    // копируем файл из промежуточной папки в финальную директорию
    io.emit("workerResponse", {
      fileInfo: {
        id,
        stage: 3
      }
    });
    
    await fsPromise.copyFile(finalInTemp, outputFile);
    // если всё ок, то отправляем на сервер инфу что у файла изменился stage
    io.emit("workerResponse", {
      fileInfo: {
        id,
        status: 0
      }
    });
  } catch (e) {
    // если ошибка связана с отменой файла то это ОК, не пробрасываем ее дальше
    if (!(e.message && e.message.split(" ").includes("SIGKILL"))) {
      io.emit("workerResponse", {
        fileInfo: {
          id,
          status: 1,
          errorMessage: `Обработчик №: ${
            settings.workerID
          }\nЭтап: Слияние\n${e}`
        }
      });
    }
  }
};
