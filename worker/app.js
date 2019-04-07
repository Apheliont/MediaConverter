require("dotenv").config(".env");
const port = process.env.PORT || 3000;
const path = require("path");

const {
  transcode,
  stopConversion
} = require("./transcode");

const analyze = require("./analyzeFile");

const settings = {
  condition: {
    files: new Set(),
    isBusy: false,
    addFile(id) {
      this.files.add(id);
      return this.files;
    },
    deleteFile(id) {
      this.files.delete(id);
      return this.files;
    }
  },
  workerID: null,
  uploadPath: null,
  categories: null
};

let tmpDir = null;
Object.defineProperty(settings, "tempFolder", {
  get: function() {
    return tmpDir;
  },
  set: function(value) {
    const firstSymbol = value[0];
    if (firstSymbol === ".") {
      tmpDir = path.join(__dirname, value);
    } else {
      tmpDir = value;
    }
  }
});

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

// create https server
const server = require("http").createServer();

const io = require("socket.io")(server, {
  pingTimeout: 5000,
  pingInterval: 7000,
  path: "/worker"
});

// create socket.io server
io.on("connection", socket => {
  socket.emit("initState", {
    isBusy: settings.condition.isBusy,
    files: Array.from(settings.condition.files)
  });

  socket.on("settings", data => {
    for (let prop in data) {
      if (prop in settings) {
        settings[prop] = data[prop];
      }
    }
  });

  socket.on("stopConversion", () => {
    stopConversion();
  });
  socket.on(
    "transcode",
    async ({
      id,
      fileName,
      extension,
      sourcePath,
      category,
      startTime,
      endTime
    }) => {
      extension = extension.toLowerCase();

      // Если исходный путь не указан, то считаем что файл зализ через web
      // интерфейс и ставим путь как в настройках
      if (sourcePath === "") {
        sourcePath = settings.uploadPath;
      }

      if (settings.workerID === null || settings.condition.isBusy) {
        return;
      }

      settings.condition.isBusy = true;
      // сообщаем серверу что воркер занят задачей
      io.emit("isWorkerBusy", {
        isBusy: settings.condition.isBusy,
        files: Array.from(settings.condition.addFile(id))
      });

      // меняем статус файл на "в работе"
      io.emit("changeFileStatus", {
        id,
        status: 2
      });

      // на основании ID категории воссоздаем путь для сохранения файла
      const destinationPath = settings.categories.find(
        cat => cat.id === Number(category)
      ).path;

      console.log("----------------------------------------------");
      console.log("Исходный файл: ", `${sourcePath}${fileName}${extension}`);
      console.log("Путь назначения: ", destinationPath);
      console.log("----------------------------------------------");

      try {
        const file = path.join(sourcePath, `${fileName}${extension}`);
        const options = await analyze({ extension, file });

        // считаем время для частичной конвертации
        // ----------------------------------------------
        let duration = options.metadata.format.duration || 0;

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


        // отправляем серверу уточняющие данные о видео файле
        io.emit("updateFile", {
          id,
          duration
        });
        const fullFileInfo = {
          id,
          fileName,
          extension,
          duration,
          sourcePath,
          destinationPath,
          options
        };

        await transcode({
          fullFileInfo,
          tempFolder: settings.tempFolder,
          io
        });

        io.emit("changeFileStatus", {
          id,
          status: 0
        });
      } catch (e) {
        console.log("Файл кодирован неудачно", e);
        io.emit("changeFileStatus", {
          id,
          status: 1
        });
      } finally {
        settings.condition.isBusy = false;
        // сообщаем серверу что воркер освободился
        io.emit("isWorkerBusy", {
          isBusy: settings.condition.isBusy,
          files: Array.from(settings.condition.deleteFile(id))
        });
      }
      // добавь e.message!!!
    }
  );
});

server.listen(port, () => {
  console.log(`Worker ready to server on port ${port}`);
});
