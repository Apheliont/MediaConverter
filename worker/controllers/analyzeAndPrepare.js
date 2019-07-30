const path = require("path");
const fsPromise = require("fs").promises;
const settings = require("../settings");
const io = require("../socket.io-server");
const analyze = require("../processors/analyze");
const prepare = require("../processors/prepare");
const rescue = require("../processors/rescue");

// конвертирует время вида 00:00:00 (string) в секунды (int)
function stringTimeToNumber(str) {
  const time = str.split(":");
  let multiplier = 3600;
  return time
    .map(item => {
      item *= multiplier;
      multiplier /= 60;
      return item;
    })
    .reduce((sum, next) => {
      return sum + next;
    }, 0);
}

module.exports = async function({ file, worker_timerID, file_timerID }) {
  // деструктуризуем как мутируемые переменные, т.к часть из них возможно будет
  // изменена
  let {
    id,
    fileName,
    extension,
    sourcePath,
    startTime,
    endTime,
    category
  } = file;

  try {
    const preset = settings.getPreset(category);
    extension = extension.toLowerCase();

    // Если исходный путь не указан, то считаем что файл зализ через web
    // интерфейс и ставим путь как в настройках
    if (sourcePath === "") {
      sourcePath = settings.sourcePath;
    }

    if (
      settings.workerID === undefined ||
      settings.totalPhysicalCores === 0 ||
      settings.tempFolderName === undefined
    ) {
      await Promise.reject("Состояние воркера не позволяет обрабатывать файлы");
    }

    // сообщаем серверу новое состояние воркера, подтверждения получения
    // мы сообщаем серверу что файл сменил статус на 2 хотя он уже и так в статусе 2
    // это нужно для прописания времени св-ва processing_at
    io.emit("workerResponse", {
      fileInfo: {
        id,
        status: 2
      },
      acknowledgement: {
        worker_timerID,
        file_timerID,
        fileID: id
      }
    });

    let { options, duration } = await analyze({
      fileName,
      extension,
      sourcePath,
      preset
    });

    // создаем общую temp папку если она еще не создана
    // нужны вложенные try catch блоки так как папки могут быть уже созданы
    // и это ОК, не нужно чтобы из-за этого падала вся программа
    try {
      await fsPromise.mkdir(
        path.join(settings.sourcePath, settings.tempFolderName)
      );
    } catch (e) {
      // ошибка не важна, никак ее не обрабатываем
    } finally {
      var fileTempPath = await fsPromise.mkdtemp(
        path.join(settings.sourcePath, settings.tempFolderName, `${id}-`)
      );
      await fsPromise.mkdir(path.join(fileTempPath, "prepared"));
    }

    // без поля duration дальнейшие преобразования бессмысленны
    if (duration === "N/A") {
      // дать второй шанс файлу, попробовать переложить
      // содержимое в точно такой же контейнер
      try {
        const rescuePath = path.join(fileTempPath, "rescued");
        await fsPromise.mkdir(rescuePath);
        const { rescuedFileName, rescuedExtension } = await rescue({
          id,
          fileName,
          extension,
          sourcePath,
          preset,
          rescuePath
        });
        // заново пытаемся получить инфу о файле, если и сейчас не выйдет
        // то выбрасываем ошибку
        // изменяем изначальные данные о файле
        fileName = rescuedFileName;
        extension = rescuedExtension;
        sourcePath = rescuePath;
        const rescuedFileData = await analyze({
          fileName,
          extension,
          sourcePath,
          preset
        });
        // переопределяем данные объекта options и скаляра duration
        // из внешнего скопа
        duration = rescuedFileData.duration;
        options = rescuedFileData.options;
        // повторная проверка на поле duration
        if (duration === "N/A") {
          // выбрасываем любую ошибку, далее ее переопределим и отправим дальше
          throw true;
        }
      } catch (e) {
        // переопределяем и пробрасываем ошибку дальше на внешний перехватчик
        throw "Длительность файла не определена";
      }
    }

    // считаем время для частичной конвертации

    options.partialTranscode = {
      isValid: false,
      startTime: 0
    };

    const startTimeSeconds = stringTimeToNumber(startTime);
    const endTimeSeconds = stringTimeToNumber(endTime);

    if (startTimeSeconds < endTimeSeconds && endTimeSeconds <= duration) {
      options.partialTranscode.isValid = true;
      options.partialTranscode.startTime = startTime;
      duration = endTimeSeconds - startTimeSeconds;
    } else if (
      startTimeSeconds < duration &&
      endTimeSeconds === 0 &&
      startTimeSeconds !== 0
    ) {
      options.partialTranscode.isValid = true;
      options.partialTranscode.startTime = startTime;
      duration -= startTimeSeconds;
    }
    // ----------------------------------------------

    const inputFileInfo = {
      id,
      fileName,
      extension,
      duration,
      sourcePath,
      options
    };

    // отправляем серверу уточняющие данные о видео файле
    io.emit("workerResponse", {
      fileInfo: {
        id,
        duration,
        fileTempPath
      }
    });

    // ждем завершения подготовки и дополнительных сведений о файле:
    // keyFrameInterval, extension, sourcePath(это новый путь), options
    const stage_0 = await prepare({
      preset,
      inputFileInfo,
      destinationPath: path.join(fileTempPath, "prepared")
    });

    // дополняем этот объект другими данными и отправляем на сервер
    stage_0.tempRootPath = fileTempPath;

    // если дошли до сюда то значит все ок, отправляем инфу серверу
    io.emit("workerResponse", {
      fileInfo: {
        id,
        status: 3,
        stage_0 //отправляем данные о стадии 0 это будет сигналом для перевода на следующую стадию
      }
    });
  } catch (e) {
    // если ошибка связана с отменой файла пользователем,
    // то это ОК, не пробрасываем ее дальше
    if (!(e.message && e.message.split(" ").includes("SIGKILL"))) {
      io.emit("workerResponse", {
        fileInfo: {
          id,
          status: 1,
          errorMessage: `Обработчик №: ${
            settings.workerID
          }\nЭтап: Анализ и подготовка\n${e}`
        }
      });
    }
  }
};
