const fsPromise = require("fs").promises;
const path = require("path");
const settings = require("../settings");
const transcode = require("../processors/transcode");
const io = require("../socket.io-server");

module.exports = async function({ file, worker_timerID, file_timerID }) {
  // деструктуризуем данные объекта file
  const {
    id,
    fileName,
    extension,
    category,
    tempRootPath,
    options,
    keyFrameInterval,
    partsToTranscode, // массив с номерами частей
    lastPart,
    partSuffix
  } = file;
  try {
    if (
      settings.workerID === undefined ||
      settings.totalPhysicalCores === 0 ||
      settings.tempFolderName === ""
    ) {
      await Promise.reject("Состояние воркера не позволяет обрабатывать файлы");
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
    const inputFile = path.join(
      tempRootPath,
      "prepared",
      `${fileName}${extension}`
    );

    // создаем temp папку для складирования откодированных частей если она еще не создана
    // нужны вложенные try catch блоки так как папки могут быть уже созданы
    // и это ОК, не нужно чтобы из-за этого падала вся программа
    try {
      await fsPromise.mkdir(path.join(tempRootPath, "parts"));
    } catch (e) {
      // ошибка не важна
    }
    const preset = settings.getPreset(category);
    const outputFormat = preset.O_FORMAT;
    const destPath = path.join(tempRootPath, "parts");
    const partsPromises = [];

    for (const part of partsToTranscode) {
      const outputFile = path.join(
        destPath,
        `${fileName}${partSuffix}${part + 1}${outputFormat}`
      );

      partsPromises.push(transcode({
        id,
        part,
        inputFile,
        outputFile,
        options,
        startTime: part * keyFrameInterval,
        duration: keyFrameInterval,
        isLast: lastPart === part,
        preset
      }));
    }

    await Promise.all(partsPromises);
    // если все ОК то отправляем инфу серверу что части файла откодированы
    io.emit("workerResponse", {
      fileInfo: {
        id,
        stage_1: {
          transcodedParts: partsToTranscode
        }
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
          }\nЭтап: Кодирование по частям\n${e}`
        }
      });
    }
  }
};
