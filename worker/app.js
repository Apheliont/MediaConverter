require("dotenv").config(".env");
const si = require("systeminformation");
const settings = require("./settings");
const io = require("./socket.io-server");

const analizeAndPrepare = require("./controllers/analyzeAndPrepare");
const transcode = require("./controllers/transcode");
const merge = require("./controllers/merge");

async function init() {
  try {
    const { physicalCores } = await si.cpu();
    settings.physicalCores = physicalCores;

    io.on("connection", socket => {
      socket.emit("workerResponse", {
        sysInfo: {
          physicalCores: settings.physicalCores
        }
      });

      socket.on("settings", data => {
        for (let prop in data) {
          if (prop in settings) {
            settings[prop] = data[prop];
          }
        }
      });

      socket.on("stopConversion", id => {
        const commands = settings.condition.getFileCommandsById(id);
        for (const command of commands) {
          command.kill();
          settings.condition.deleteFileCommand(id, command);
        }
      });
      // при дисконнекте воркера от сервера, останавливаем все текущие конвертации
      socket.on("disconnect", () => {
        const commands = settings.condition.getAllFileCommands();
        for (const command of commands) {
          command.kill();
        }
        settings.condition.deleteAllCommands();
      });
      // в зависимости от того на каком этапе находится
      // файл выбираем разные методы
      // data - {file, file_timerID, worker_timerID}
      socket.on("process", data => {
        const stage = data.file.stage;
        switch (stage) {
          case 0:
            analizeAndPrepare(data);
            break;
          case 1:
            transcode(data);
            break;
          case 2:
            merge(data);
            break;
        }
      });
    });
  } catch (e) {
    console.log("Ошибка в функции init ", e.message);
  }
}

init();
