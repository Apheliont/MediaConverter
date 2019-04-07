const fs = require("fs");
const path = require("path");
const db = require("../database/main");
const settings = require("./settings");
let { informClients } = require("../socket.io-server");
informClients = informClients("FILEINFO");

module.exports = (function() {
  let lockFileTimerId = {}; // хранит ID таймеров залоченых файлов
  const lockTime = 5000; // время на которое лочится файл
  const outerMethods = {};

  class File {
    constructor({
      id,
      fileName,
      extension,
      size,
      category,
      status = 3,
      sourcePath = '', // если поле пустое то воркер возмет дефолтный путь для uploadFiles
      startTime = "00:00:00",
      endTime = "00:00:00",
      workerID = null,
      duration = null
    }) {
      this.id = id;
      this.fileName = fileName;
      this.extension = extension;
      this.size = size;
      this.category = category;
      this.status = status; // 0 - OK, 1 - ERR, 2 - ENCODING, 3 - PENDING, 4 - LOCK(PREPARING)
      this.sourcePath = sourcePath;
      this.startTime = startTime;
      this.endTime = endTime;
      this.duration = duration;
      this.workerID = workerID;
      this.progress = 0;
    }

    lockFile() {
      this.status = 4;
      lockFileTimerId[this.id] = setTimeout(() => {
        if (this) {
          this.status = 3;
        }
      }, lockTime);
    }

    unlockFile() {
      const timerId = lockFileTimerId[this.id];
      if (timerId) {
        clearTimeout(timerId);
        delete lockFileTimerId[this.id];
        return true;
      }
      return false;
    }
  }

  return new class {
    constructor() {
      this.storage = [];
    }
    addMethod(name, method) {
      outerMethods[name] = method;
    }
    getFileById(id) {
      return this.storage.find(file => id === file.id);
    }
    getFiles() {
      return this.storage;
    }
    deleteFileById(id) {
      const fileToDelete = this.getFileById(id);
      if (!fileToDelete) {
        return false;
      }
      // редкий случай - пользователь удаляет файл в тот момент когда
      // инфа о кодировании еще не подтверждена со стороны воркера
      if (fileToDelete.status === 4) {
        return false;
      }
      // вариант того что файл уже обрабатывается воркером
      if (fileToDelete.status === 2) {
        const workerID = fileToDelete.workerID;
        const worker = outerMethods["getWorkerById"](workerID);
        worker.stopConversion();
        return false;
      }
      // вариант того что файл удален пользователем или воркер обработал файл
      const indexOfFile = this.storage.findIndex(file => file.id === id);
      if (indexOfFile !== -1) {
        // удалить из ФС если такой файл есть(случай удаления пользователем);
        const filePath = path.join(
          settings.get("uploadPath"),
          `${fileToDelete.fileName}${fileToDelete.extension}`
        );
        const exists = fs.existsSync(filePath);
        if (exists) {
          fs.unlinkSync(filePath, () => {});
        }
        //-------------------
        db.deleteFile(id).then(() => {
          this.storage.splice(indexOfFile, 1);
          informClients("DELETEFILE", id);
        });
      }
      return false;
    }

    changeStatus({ id, status }) {
      const file = this.getFileById(id);
      if (!file) {
        return false;
      }
      file.unlockFile(); // аннулировать таймер блокировки файла
      file.status = status;
      // делаем запись в БД
      let timeStamp = "";
      if (status === 2) {
        timeStamp = "processing_at";
      } else {
        timeStamp = "finished_at";
      }
      const date = new Date();
      db.updateFile({
        id,
        status,
        [timeStamp]: `${date.getFullYear()}-${date.getMonth() +
          1}-${date.getDate()} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`
      })
        .then(() => {
          if (status !== 2) {
            this.deleteFileById(id);
          } else {
            informClients("UPDATEFILE", { id, status });
          }
        })
        .catch(e => {
          console.log("Ошибка в changeStatus", e.message);
        });
    }
    async addFile(data) {
      try {
        const date = new Date();
        const id = await db.addFile({
          ...data,
          created_at: `${date.getFullYear()}-${date.getMonth() +
            1}-${date.getDate()} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`
        });
        this.storage.push(new File({ ...data, id }));
        return id;
      } catch (e) {
        console.log("Ошибка в функции addFile", e.message);
      }
    }

    async restoreFiles() {
      if (this.storage.length > 0) {
        return;
      }
      const files = await db.getFiles();

      function checkFile(file) {
        const workerID = file.workerID;
        if (workerID !== null) {
          const worker = outerMethods["getWorkerById"](workerID);
          if (
            worker &&
            worker.condition.status === 1 &&
            worker.condition.isBusy &&
            worker.condition.files.has(file.id)
          ) {
            return true;
          }
        }
        return false;
      }

      async function removeBrokenFile(id) {
        try {
          await db.updateFile({ id, status: 1 });
          return db.deleteFile(id);
        } catch (e) {
          console.log("Ошибка в функции removeBrokenFile", e.message);
        }
      }

      files.forEach(file => {
        switch (file.status) {
          case 3:
            this.storage.push(new File(file));
            break;
          case 2:
            checkFile(file)
              ? this.storage.push(new File(file))
              : removeBrokenFile(file.id);
            break;

          case 1:
          case 0:
            db.deleteFile(file.id);
            break;
        }
      });
    }

    getPendingFile() {
      const file = this.storage.find(file => file.status === 3);
      if (file) {
        file.lockFile();
        return file;
      }
    }

    updateFile(file) {
      const fileToUpdate = this.getFileById(file.id);
      if (fileToUpdate) {
        db.updateFile(file)
          .then(() => {
            informClients("UPDATEFILE", file);
            for (let prop in file) {
              fileToUpdate[prop] = file[prop];
            }
          })
          .catch(e => {
            console.log("Ошибка в функции updateFile", e.message);
          });
      }
    }
  }();
})();
