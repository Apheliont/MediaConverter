require("dotenv").config(".env");
const si = require("systeminformation");
const settings = require("./settings");
const io = require("./socket.io-server");
const { deleteSourceFile, deleteTempFolder, deleteOutputFile } = require("./processors/delete");

const analizeAndPrepare = require("./controllers/analyzeAndPrepare");
const transcode = require("./controllers/transcode");
const merge = require("./controllers/merge");

async function init() {
  try {
    const { cores } = await si.cpu();
    settings.physicalCores = cores / 2;

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
        io.emit("workerResponse", {
          fileInfo: {
            id,
            status: 4
          }
        });
      });
      // при дисконнекте воркера от сервера, останавливаем все текущие конвертации
      socket.on("disconnect", () => {
        const commands = settings.condition.getAllFileCommands();
        for (const command of commands) {
          command.kill();
        }
        settings.condition.deleteAllCommands();
      });

      // удаляем оригинальный файл и темп папку если она была создана
      // dataToClear это объект у которого 2 или 3 свойства: 1) sourceFile - это объект
      // у которого 3 поля =) : sourcePath, fileName, extension
      // 2) tempRootPath - это путь к сгенереной темп папки для конкретного файла
      // 3) Может присутствовать а может и нет объект outputFile
      // если он есть, это значит нам надо удалить выходной файл т.к он был создан
      socket.on("deleteFiles", fileData => {
        deleteSourceFile(fileData.sourceFile);
        deleteTempFolder(fileData.tempRootPath);
        // проверяем если в fileData присутствует объект outputFile
        if (fileData.outputFile !== undefined) {
          deleteOutputFile(fileData.outputFile);
        }
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
