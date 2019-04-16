const io = require("socket.io-client");
const db = require("../database/main");
const EventEmitter = require("events");
let { informClients } = require("../socket.io-server");
const informAboutWorker = informClients("WORKERINFO");
const informAboutFile = informClients("FILEINFO");
const settings = require("./settings");
const category = require("./category");

module.exports = (function() {
  let lockWorkerTimerId = {}; // хранит ID таймеров залоченых воркеров
  const lockTime = 5000; // время на которое лочится воркер
  const outerMethods = {};

  const commonData = new class extends EventEmitter {
    constructor() {
      super();
      this.coresPerWorker = {};
    }

    getTotalCores() {
      return Object.values(this.coresPerWorker).reduce((sum, next) => {
        return sum + next;
      }, 0);
    }

    addWorkerCores({ id, cores }) {
      id = parseInt(id);
      cores = parseInt(cores);
      if (
        Number.isInteger(id) &&
        Number.isInteger(cores) &&
        this.coresPerWorker[id] !== cores
      ) {
        this.coresPerWorker[id] = cores;
        this.emit("totalCoresChanged");
      }
    }

    removeWorkerCores(id) {
      id = parseInt(id);
      if (Number.isInteger(id) && id in this.coresPerWorker) {
        delete this.coresPerWorker[id];
        this.emit("totalCoresChanged");
      }
    }
  }();

  class WorkerNode {
    constructor(data) {
      this.id = data.id;
      this.host = data.host;
      this.port = data.port;
      this.name = data.name;
      this.description = data.description;
      this.tempFolder = data.tempFolder; // УДАЛИТЬ и из ФРОНТА!
      // поменяй название во фронте
      this.sourcePath = data.sourceFolder; // путь по умолчанию для файлов закачанных через веб,
      this.options = data.options;
      this.sysInfo = {
        physicalCores: 0
      };
      this.condition = {
        message: "Неизвестно",
        files: new Set(),
        isBusy: false,
        status: 0 // 0 - disconnect; 1 - online; 2 - crashed;
      };
      this.socket = io(
        `http://${data.host}:${data.port}`,
        Object.assign({}, data.options)
      );

      // установка обработчиков событий
      this.socket.on("connect", () => {
        this.condition.status = 1;
        this.condition.message = "Подключен";

        // сообщаем пользователям состояние воркера
        informAboutWorker("WORKERINFO", this.getCondition());
      });

      // слушаем если изменились категории
      // обязатель байндимся, т.к эвент эмитер передает
      // в колбак слушателя свой контекст
      category.on("updateCategories", this.updateCategories.bind(this));

      this.socket.on("disconnect", reason => {
        this.condition.status = 0;
        this.condition.message = reason;
        // обновляем глобальный синглтон содержащий общее число ядер
        commonData.removeWorkerCores(this.id);

        informAboutWorker("WORKERINFO", this.getCondition());
      });

      this.socket.on("error", err => {
        this.condition.status = 2;
        this.condition.message = err.message;
        // обновляем глобальный синглтон содержащий общее число ядер
        commonData.removeWorkerCores(this.id);

        informAboutWorker("WORKERINFO", this.getCondition());
      });

      this.socket.on("initState", data => {
        console.log('init state: ', data);
        this.changeCondition(data.condition);
        // получаем инфу о физических ядрах и т.д
        this.updateSysInfo(data.sysInfo);

        // обновляем глобальный синглтон содержащий общее число ядер
        commonData.addWorkerCores({ id: this.id, cores: data.sysInfo.physicalCores });

        // теперь можно передать воркеру его настройки вместе с общим числом
        // физических ядер в кластере
        this.updateSettings();
        this.updateCategories();

        informAboutWorker("WORKERINFO", this.getCondition());
        //нужно удалить все файлы которые начали кодироваться
        //но возможно стали битыми по причине что воркер упал
        const files = outerMethods["getFiles"]();
        const filteredFiles = files.filter(file => {
          return file.workerID === this.id && file.status === 2;
        });
        filteredFiles.forEach(file => {
          if (!this.condition.files.has(file.id)) {
            outerMethods["changeStatus"]({
              id: file.id,
              status: 1
            });
          }
        });
        this.tryTranscodeNext();
      });

      this.socket.on("isWorkerBusy", data => {
        this.changeCondition(data);
        informAboutWorker("WORKERINFO", this.getCondition());
        this.tryTranscodeNext();
      });
      // ------------- file events ---------------
      this.socket.on("updateFile", data => {
        console.log('updatefile: ', data);
        //outerMethods["updateFile"](data);
      });
      this.socket.on("fileProgress", data => {
        informAboutFile("UPDATEFILE", data);
      });
      this.socket.on("changeFileStatus", data => {
        outerMethods["changeStatus"](data);
        console.log("Change file status!: ", data);
      });
    }

    getCondition() {
      const worker = {};
      worker.id = this.id;
      worker.condition = Object.assign({}, this.condition);
      return worker;
    }

    changeCondition({ isBusy, files }) {
      this.unlockWorker();
      this.condition.isBusy = isBusy;
      this.condition.files = new Set(files);
    }

    updateSysInfo(data) {
      this.sysInfo.physicalCores = +data.physicalCores;
    }

    updateSettings() {
      this.socket.emit("settings", {
        workerID: this.id,
        totalPhysicalCores: commonData.getTotalCores(),
        sourcePath: this.sourcePath
      });
    }

    updateCategories() {
      const categories = category.get("id", "path");
      this.socket.emit("settings", {
        categories
      });
    }

    tryTranscodeNext() {
      if (!this.condition.isBusy) {
        const fileToTranscode = outerMethods["getPendingFile"]();
        if (fileToTranscode) {
          this.transcode(fileToTranscode);
        }
      }
    }

    connect() {
      this.socket.open();
    }
    // --------------------------------------------

    disconnect() {
      this.socket.close();
    }

    isReadyToServe() {
      return this.condition.status === 1 && !this.condition.isBusy;
    }

    lockWorker() {
      this.condition.isBusy = true;
      lockWorkerTimerId[this.id] = setTimeout(() => {
        this.condition.isBusy = false;
      }, lockTime);
    }

    unlockWorker() {
      const timerId = lockWorkerTimerId[this.id];
      if (timerId) {
        clearTimeout(timerId);
        delete lockWorkerTimerId[this.id];
        return true;
      }
      return false;
    }
    //------------------------------
    transcode(file) {
      console.log('transcode: ', file);
      // в зависимости от того на каком этапе находится файл принимаем решения
      switch(file.stage) {
        case 0:
              outerMethods["updateFile"]({
                id: file.id,
                workerID: this.id
              });
              this.socket.emit("analyzeAndPrepare", file);
              break;
        case 1:
        case 2:
      }
      // this.socket.emit("transcode", file);
    }

    stopConversion() {
      this.socket.emit("stopConversion");
    }
  }

  return new class {
    constructor() {
      this.storage = [];
      // слушаем изменения общего числа ядер и оповещаем все воркеры
      commonData.on("totalCoresChanged", () => {
        this.storage.forEach(worker => worker.updateSettings());
      });
    }

    addMethod(name, method) {
      outerMethods[name] = method;
    }

    getWorkers() {
      try {
        return Array.from(this.storage).map(worker => {
          const newWorker = {};
          for (let prop in worker) {
            if (prop === "socket" || prop === "options") {
              continue;
            }
            newWorker[prop] = worker[prop];
          }
          newWorker["autoConnect"] = worker.options.autoConnect;
          return newWorker;
        });
      } catch (e) {
        console.log("Ошибка в getWorkers", e.message);
        throw e;
      }
    }

    async addWorker(data) {
      try {
        const id = await db.addWorker(data);
        const options = Object.assign({}, settings.get("worker"), {
          autoConnect: data.autoConnect
        });
        const newWorker = Object.assign({}, data, { options }, { id });
        delete newWorker.autoConnect;

        this.storage.push(new WorkerNode(newWorker));
        if (data.autoConnect) {
          this.getWorkerById(id).connect();
        }
        return id;
      } catch (e) {
        console.log("Ошибка в addWorker", e.message);
        throw e;
      }
    }

    async deleteWorker(id) {
      try {
        await db.deleteWorker(id);
        const index = this.storage.findIndex(worker => worker.id === id);
        if (index !== -1) {
          // перед удалением отключаем воркер
          const worker = this.storage[index];
          worker.disconnect();
          this.storage.splice(index, 1);
        }
      } catch (e) {
        console.log("Ошибка в deleteWorker", e.message);
        throw e;
      }
    }

    async updateWorker(id, payload) {
      try {
        await db.updateWorker(id, payload);
        const currentWorker = this.getWorkerById(id);
        for (let prop in payload) {
          if (
            prop === "condition" ||
            prop === "socket" ||
            prop === "id" ||
            prop === "options"
          ) {
            continue;
          }
          currentWorker[prop] = payload[prop];
        }
        currentWorker.options.autoConnect = payload.autoConnect;
        if (currentWorker.condition.status === 1) {
          // делаем реконнект
          currentWorker.disconnect();
          setTimeout(() => {
            currentWorker.connect();
          }, 2000);
        }
      } catch (e) {
        console.log("Ошибка в updateWorker", e.message);
        throw e;
      }
    }

    async restoreWorkers() {
      if (this.storage.length > 0) {
        return;
      }
      try {
        const workers = await db.getWorkers();
        workers.forEach(worker => {
          const options = Object.assign({}, settings.get("worker"), {
            autoConnect: worker.autoConnect === 1 ? true : false
          });
          delete worker.autoConnect;
          const newWorker = Object.assign({}, worker, { options });
          this.storage.push(new WorkerNode(newWorker));
          if (newWorker.options.autoConnect) {
            this.getWorkerById(worker.id).connect();
          }
        });
      } catch (e) {
        console.log("Ошибка в restoreWorkers", e.message);
        throw e;
      }
    }
    //-----------------------------
    getWorkerById(id) {
      return this.storage.find(worker => worker.id === id);
    }

    getIdleWorker() {
      const idleWorker = this.storage.find(worker => worker.isReadyToServe());
      if (idleWorker) {
        idleWorker.lockWorker();
        return idleWorker;
      }
    }

    connect(id) {
      const worker = this.storage.find(worker => worker.id === id);
      if (worker !== -1) {
        worker.connect();
      }
    }

    disconnect(id) {
      const worker = this.storage.find(worker => worker.id === id);
      if (worker !== -1) {
        worker.disconnect();
      }
    }

    connectAll() {
      this.storage.forEach(worker => {
        worker.connect();
      });
    }

    disconnectAll() {
      this.storage.forEach(worker => {
        worker.disconnect();
      });
    }
  }();
})();
