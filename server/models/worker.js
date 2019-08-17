const io = require("socket.io-client");
const db = require("../database/main");
const EventEmitter = require("events");
const settings = require("./settings");
const category = require("./category");

module.exports = (function () {
  const lockTime = 7000; // время на которое лочится воркер
  const outerMethods = {};

  // используется для хранения и оповещения об изменении данных общих для всех воркеров
  const commonData = new(class extends EventEmitter {
    constructor() {
      super();
      this.coresPerWorker = {}; // key - worker_id, value - кол-во ядер
      this.tempFolderName = settings.get("tempFolderName");
      // если была изменена tempFolder то надо разослать инфу по всем воркерам
      settings.on("updateSettings", () => {
        const newTempFolderName = settings.get("tempFolderName");
        if (newTempFolderName !== this.tempFolderName) {
          this.tempFolderName = newTempFolderName;
          this.emit("commonDataChanged");
        }
      });
    }

    getTotalCores() {
      return Object.values(this.coresPerWorker).reduce((sum, next) => {
        return sum + next;
      }, 0);
    }

    getTempFolderName() {
      return this.tempFolderName;
    }

    addWorkerCores({
      id,
      cores
    }) {
      id = parseInt(id);
      cores = parseInt(cores);
      if (
        Number.isInteger(id) &&
        Number.isInteger(cores) &&
        this.coresPerWorker[id] !== cores
      ) {
        this.coresPerWorker[id] = cores;
        this.emit("commonDataChanged");
      }
    }

    removeWorkerCores(id) {
      id = parseInt(id);
      if (Number.isInteger(id) && id in this.coresPerWorker) {
        delete this.coresPerWorker[id];
        this.emit("commonDataChanged");
      }
    }
  })();
  // класс воркера
  class WorkerNode extends EventEmitter {
    constructor(data) {
      super();
      this.id = data.id;
      this.host = data.host;
      this.port = data.port;
      this.name = data.name;
      this.description = data.description;
      this.sourcePath = data.sourcePath; // путь по умолчанию для файлов закачанных через веб,
      this.options = data.options;
      // хранит ID таймеров, для разлока ядер воркера
      // каждый key сопоставлен с объектом типа timer
      this.lockCoresTimerId = {};
      this.state = {
        message: "Неизвестно",
        fileIDs: {}, // key - fileID, value - кол-во частей которые были отправлены на обработчик
        physicalCores: 0,
        status: 0, // 0 - disconnect; 1 - online; 2 - crashed;
        get idleCores() {
          const ic =
            this.physicalCores -
            Object.values(this.fileIDs).reduce((sum, next) => {
              return sum + next;
            }, 0);
          return ic >= 0 ? ic : 0;
        }
      };
      // слушаем если изменились категории
      // обязатель байндимся, т.к эвент эмитер передает
      // в колбак слушателя свой контекст
      category.on("updateCategories", this.updateCategories.bind(this));
    }

    // функция которая создает св-во с объектом вебсокета
    // и навешивает обработчики на события вебсокетов
    // вызывается из другой фукнции - connect()
    socketIOinit() {
      this.socket = io(
        `http://${this.host}:${this.port}`,
        Object.assign({}, this.options)
      );
      // установка обработчиков событий
      this.socket.on("connect", () => {
        this.state.status = 1;
        this.state.message = "Подключен";
        this.state.fileIDs = {}; // обнуляем счетчик кодируемых файлов
        // сообщаем пользователям состояние воркера
        this.emit("workerInfo", this.getInfo());
      });

      this.socket.on("disconnect", reason => {
        this.state.status = 0;
        this.state.message = reason;
        // последовательность имеет значение! В releaseWorker удаляются fileIDs
        const fileIDs = Object.keys(this.state.fileIDs).map(key =>
          parseInt(key)
        );
        this.releaseWorker();
        outerMethods["releaseFiles"](fileIDs, this.id);
        this.emit("workerInfo", this.getInfo());
      });

      this.socket.on("error", err => {
        this.state.status = 2;
        this.state.message = err.message;
        // последовательность имеет значение! В releaseWorker удаляются fileIDs
        const fileIDs = Object.keys(this.state.fileIDs).map(key =>
          parseInt(key)
        );
        this.releaseWorker();
        outerMethods["releaseFiles"](fileIDs, this.id);
        this.emit("workerInfo", this.getInfo());
      });

      // единое событие от воркера внутри которого могут содержаться отдельные объекты
      // с разным назначением. Это сделано как альтернатива транзакции, эти события
      // взаимосвязаны, не должно быть случая когда часть из них дошли а часть нет
      this.socket.on("workerResponse", data => {
        // обновляем инфу о файле
        if ("fileInfo" in data) {
          const fileID = data.fileInfo.id;
          // если ID undefined, значит была перехвачена ошибка не связанная с файлом
          // п.с. Такой случай возможен??!
          if (fileID === undefined) return;
          if (fileID in this.state.fileIDs) {
            // если файл был остановлен, упал с ошибкой, успешно завершен
            // или просто перешел в фазу ожидания
            // мы полностью удаляем этот файл из кодируемых воркером
            if (
              data.fileInfo.status !== undefined &&
              data.fileInfo.status !== 2
            ) {
              delete this.state.fileIDs[fileID];
            }
            // если пришла инфа от stage_1 (транскод по частям)
            // смотрим сколько частей откодировалось
            if ("stage_1" in data.fileInfo) {
              const parts = data.fileInfo["stage_1"].transcodedParts.length;
              this.state.fileIDs[fileID] -= parts;
              if (this.state.fileIDs[fileID] <= 0) {
                delete this.state.fileIDs[fileID];
              }
            }
            this.emit("workerInfo", this.getInfo());
          }
          // инъектим в объект data.fileInfo ID воркера
          // это нужно чтобы расчитать в моделе файла
          // сколько еще частей в активном состоянии
          data.fileInfo.workerID = this.id;
          outerMethods["updateFile"](data.fileInfo);
          this.emit("tryProcessNext");
        }
        // подверждаем получение воркером файла и лока ядер
        if ("acknowledgement" in data) {
          const ack = data.acknowledgement;
          if ("worker_timerID" in ack) {
            this.acknowledgeCores(ack["worker_timerID"]);
          }
          if ("file_timerID" in ack && "fileID" in ack) {
            const file = outerMethods["getFileById"](ack.fileID);
            if (file) {
              // функция принимает 2 аргумента: 1) workerID 2) timerID для файла
              file.acknowledgeFile(this.id, ack["file_timerID"]);
            }
          }
        }
        // обновляем инфу о физических ядрах воркера
        if ("sysInfo" in data && "physicalCores" in data.sysInfo) {
          const cores = +data.sysInfo.physicalCores;
          // получаем инфу о физических ядрах
          this.state.physicalCores = cores;
          // обновляем глобальный синглтон содержащий общее число ядер
          commonData.addWorkerCores({
            id: this.id,
            cores
          });
          // теперь можно передать воркеру его настройки вместе с общим числом
          // физических ядер в кластере
          this.updateSettings();
          this.updateCategories();
          this.emit("tryProcessNext");
          // оповещаем фронт о ядрах воркера
          this.emit("workerInfo", this.getInfo());
        }
        // инфа о проценте готовности кодирования
        if ("fileProgress" in data) {
          // объект fileProgress: key - fileID,
          // value - Object: key - part<int>, value - progress<int>
          outerMethods["updateFileProgress"](data.fileProgress);
        }
      });
    }

    // "отпускает" обработчик. Это значит обнуляет все данные состояния
    // об обработчике. Всё что могло "накопиться" во время работы
    releaseWorker() {
      // обновляем глобальный синглтон содержащий общее число ядер
      commonData.removeWorkerCores(this.id);
      // если были какие-то таймеры все их подтверждаем
      const timerIDs = Object.keys(this.lockCoresTimerId);
      for (const timerID of timerIDs) {
        this.acknowledgeCores(timerID);
      }
      // убираем все ID из текущих кодируемых воркером
      this.state.fileIDs = {};
    }

    // для фронтенда
    getInfo() {
      const worker = {};
      worker.id = this.id;
      worker.state = Object.assign({}, this.state);
      return worker;
    }

    updateSettings() {
      this.socket.emit("settings", {
        workerID: this.id,
        totalPhysicalCores: commonData.getTotalCores(),
        sourcePath: this.sourcePath,
        tempFolderName: commonData.getTempFolderName()
      });
    }

    updateCategories() {
      const categories = category.get("id", "path", "preset");
      this.socket.emit("settings", {
        categories
      });
    }

    connect() {
      this.socketIOinit();
      this.socket.open();
    }

    disconnect() {
      this.socket.close();
    }

    isReadyToServe() {
      return this.state.status === 1 && this.state.idleCores > 0;
    }

    // блокирует ядра определенного воркера для определенного файла,
    // чтобы не было ошибок при асинхронном выполнении
    // если блокирование успешно возвращаем timer_id, в противном случае -1
    lockCores(fileID, parts) {
      if (!this.isReadyToServe) return -1;
      const timerID = Date.now();
      // для контроля какие файлы кодирует воркер, записываем ID файла и число
      // частей которые были отправлены воркеру этого файла
      if (!(fileID in this.state.fileIDs)) {
        this.state.fileIDs[fileID] = 0;
      }
      this.state.fileIDs[fileID] += parts;
      // оповещаем фронт
      this.emit("workerInfo", this.getInfo());
      // используем байнд - нужно передать контекст в функцию,
      // где само хранилище таймеров это объект со своим контекстом
      this.lockCoresTimerId[timerID] = setTimeout(
        function () {
          // если файл уже был обработан и удален, то минуем вычитание частей
          if (this.state.fileIDs[fileID] !== undefined) {
            this.state.fileIDs[fileID] -= parts;
            if (this.state.fileIDs[fileID] <= 0) {
              delete this.state.fileIDs[fileID];
            }
          }
          delete this.lockCoresTimerId[timerID];
          this.emit("workerInfo", this.getInfo());
          this.emit("tryProcessNext");
        }.bind(this),
        lockTime
      );
      return timerID;
    }

    acknowledgeCores(timerID) {
      if (timerID in this.lockCoresTimerId) {
        clearTimeout(this.lockCoresTimerId[timerID]);
        delete this.lockCoresTimerId[timerID];
      }
    }

    stopConversion(id) {
      this.socket.emit("stopConversion", id);
    }

    deleteFiles(fileData) {
      // fileData это объект у которого 2 или 3 свойства: 1) sourceFile - это объект
      // у которого 3 поля =) : sourcePath, fileName, extension
      // 2) tempRootPath - это путь к сгенереной темп папки для конкретного файла
      // 3) Переменное св-во объект outputFile, оно может быть а может и нет
      // Если файл был удален пользователем и стадия была 2 - поле присуствует
      this.socket.emit("deleteFiles", fileData);
    }
  }

  return new(class extends EventEmitter {
    constructor() {
      super();
      this.storage = [];
      // слушаем изменения общего числа ядер и оповещаем все воркеры
      commonData.on("commonDataChanged", () => {
        this.storage.forEach(worker => worker.updateSettings());
      });
    }

    addMethod(name, method) {
      outerMethods[name] = method;
    }

    getWorkers() {
      return this.storage.map(worker => {
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
    }

    async addWorker(data) {
      try {
        const id = await db.addWorker(data);
        const options = Object.assign({}, settings.get("worker"), {
          autoConnect: data.autoConnect
        });
        const newWorker = Object.assign({}, data, {
          options
        }, {
          id
        });
        delete newWorker.autoConnect;

        // вешаем слушатель события tryProcessNext, которое будет вызываться каждый раз
        // как у какого-либо воркера изменится состояние
        const nwn = new WorkerNode(newWorker);
        // вешаем обработчик событий исходящих от экземпляра воркера
        nwn.on("tryProcessNext", this.tryProcessNext.bind(this));
        nwn.on("workerInfo", data => {
          this.emit("workerInfo", data);
        });
        this.storage.push(nwn);
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
            prop === "state" ||
            prop === "socket" ||
            prop === "id" ||
            prop === "options"
          ) {
            continue;
          }
          currentWorker[prop] = payload[prop];
        }
        currentWorker.options.autoConnect = payload.autoConnect;
        if (currentWorker.state.status === 1) {
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
          const newWorker = Object.assign({}, worker, {
            options
          });
          // создаем новую воркер ноду и вешаем обработчик
          const nwn = new WorkerNode(newWorker);
          nwn.on("tryProcessNext", this.tryProcessNext.bind(this));
          nwn.on("workerInfo", data => {
            this.emit("workerInfo", data);
          });
          this.storage.push(nwn);
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

    // функция возвращает сортированный массив массивов,
    // где вложеный массив -> 0 элемент - объект Worker
    // 1 элемент - число свободный ядер
    getIdleWorker() {
      const idleWorkers = [];
      this.storage.forEach(worker => {
        if (worker.isReadyToServe()) {
          idleWorkers.push(worker);
        }
      });
      if (idleWorkers.length > 1) {
        idleWorkers.sort((a, b) => a.state.idleCores - b.state.idleCores);
      }
      return idleWorkers.pop();
    }

    // возвращает первый попавшийся воркер из числа подключенных
    getAnyOperationalWorker() {
      for (const worker of this.storage) {
        if (worker.state.status === 1) return worker;
      }
      return undefined;
    }

    // В этой функции ищем все ожидающие обработки файлы, берем все свободные ресурсы и лочим их под конкретный файл
    // далее отправляем их в функцию process
    tryProcessNext() {
      let pendignFile = outerMethods["getPendingFile"]();
      let idleWorker = this.getIdleWorker();
      let partsToTranscode = [];
      let file_timerID;
      let worker_timerID;

      while (pendignFile !== undefined && idleWorker !== undefined) {
        const cores = idleWorker.state.idleCores;
        // вариант того что файлу нужно 1 ядро
        if (pendignFile.stage === 0 || pendignFile.stage === 2) {
          // подрузумевается что 1 ядро точно есть так как воркер попал getIdleWorker
          // залочить файл и получить ID таймера, в надежде что это не -1
          file_timerID = pendignFile.lockFile(idleWorker.id);
          // залочить ядро у воркера и получить ID таймера
          worker_timerID = idleWorker.lockCores(pendignFile.id, 1);
          if (file_timerID === -1 || worker_timerID === -1) {
            console.log(
              "Что-то пошло не так в функции tryProcessNext, один из таймеров = -1"
            );
            return;
          }
        } else {
          // вариант того что файл находится на стадии кодирования по частям
          // получить части для кодирования (массив)
          partsToTranscode = pendignFile.partsToTranscode();
          // проверить что частей не больше чем свободных ядер
          if (cores - partsToTranscode.length < 0) {
            partsToTranscode = partsToTranscode.slice(0, cores);
          }
          // залочить все части и получить ID таймера, в надежде что это не -1
          file_timerID = pendignFile.lockFile(idleWorker.id, partsToTranscode);
          // залочить ядра у воркера и получить ID таймера
          worker_timerID = idleWorker.lockCores(
            pendignFile.id,
            partsToTranscode.length
          );
          if (file_timerID === -1 || worker_timerID === -1) {
            console.log(
              "Что-то пошло не так в функции tryProcessNext для множественного кодирования, один из таймеров = -1"
            );
            return;
          }
        }
        // отправить файл на кодировку, предварительно трансформировав данные для воркера
        idleWorker.socket.emit("process", {
          file: pendignFile.transformFileData(partsToTranscode),
          file_timerID,
          worker_timerID
        });
        // снова тащим ожидающий файл и свободный воркер
        pendignFile = outerMethods["getPendingFile"]();
        idleWorker = this.getIdleWorker();
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
  })();
})();