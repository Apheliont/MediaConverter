const path = require("path");
const fsPromise = require("fs").promises;
const settings = require("../settings");
const io = require("../socket.io-server");
const analyze = require("../processors/analyze");
const Prepare = require("../processors/prepare");

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

module.exports = async function(
  { file, worker_timerID, file_timerID }
) {
  let { id, fileName, extension, sourcePath, startTime, endTime } = file;

  try {
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
      await Promise.reject(
        "Состояние воркера не позволяет обрабатывать файлы"
      );
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

    const file = path.join(sourcePath, `${fileName}${extension}`);
    const options = await analyze({ extension, file });

    // сразу выбрасываем ошибку если duration не определен
    if (options.duration === "N/A") {
      throw "Длительность файла не определена";
    }

    // считаем время для частичной конвертации
    // ----------------------------------------------
    let duration = options.duration;
    // удаляем поле duration из options, т.к duration будет общим свойством файла
    delete options.duration;

    options.partialTranscode = {
      isValid: false
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

    const fullFileInfo = {
      id,
      fileName,
      extension,
      duration,
      sourcePath,
      options
    };

    // создаем общую temp папку если она еще не создана
    // нужны вложенные try catch блоки так как папки могут быть уже созданы
    // и это ОК, не нужно чтобы из-за этого падала вся программа
    try {
      await fsPromise.mkdir(path.join(sourcePath, settings.tempFolderName));
    } catch (e) {
      // ошибка не важна, никак ее не обрабатываем
    } finally {
      var fileTempPath = await fsPromise.mkdtemp(
        path.join(sourcePath, settings.tempFolderName, `${id}-`)
      );
      await fsPromise.mkdir(path.join(fileTempPath, "prepared"));
    }

    // отправляем серверу уточняющие данные о видео файле
    io.emit("workerResponse", {
      fileInfo: {
        id,
        duration,
        fileTempPath
      }
    });

    const prepare = new Prepare({
      fullFileInfo,
      totalPhysicalCores: settings.totalPhysicalCores,
      destinationPath: path.join(fileTempPath, "prepared")
    });

    // ждем завершения подготовки и дополнительных сведений о файле:
    // keyFrameInterval, extension, sourcePath(это новый путь), options
    const stage_0 = await prepare.prepare();

    io.emit("workerResponse", {
      fileInfo: {
        id,
        parts: 1,
        status: 3,
        stage_0 //отправляем данные о стадии 0 это будет сигналом для перевода на следующую стадию
      }
    });
  } catch (e) {
    //если ошибка связана с отменой файла пользователем,
    // то это ОК, не пробрасываем ее дальше
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
          }\nЭтап: Анализ и подготовка\n${e}`
        }
      });
    }
  }
};
