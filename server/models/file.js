const db = require("../database/main");
let { informClients } = require("../socket.io-server");
informClients = informClients("FILEINFO");
const categoryModel = require("./category");

module.exports = (function() {
  const lockTime = 7000; // время на которое лочится файл
  const outerMethods = {};
  const partSuffix = "_part_";

  class File {
    constructor({
      id,
      fileName,
      extension,
      size,
      category,
      startTime,
      endTime,
      sourcePath = "" // если поле пустое то воркер возмет дефолтный путь для uploadFiles
    }) {
      this.id = Number(id);
      this.fileName = fileName;
      this.extension = extension;
      this.size = Number(size);
      this.sourcePath = sourcePath;
      this.fileTempPath = undefined; // путь к темп папке в которой будут производится все манипуляции с файлом
      this.category = Number(category);
      this.startTime = startTime || "00:00:00";
      this.endTime = endTime || "00:00:00";
      this.processing_at = undefined;
      this.finished_at = undefined;
      this.errorMessage = undefined;
      // хранит ID сопоставимые в объект Timeout для сброса таймеров
      // Ключи, это workerID, value - объект в котором ключ это timerID
      // а value это timer объект, возвращаемый методом setTimeout
      this.lockFileTimerId = {};
      // данные для разных стадий
      this.stage_0 = {
        workerID: undefined,
        keyFrameInterval: undefined,
        extension: undefined,
        tempRootPath: undefined, // Это путь к сгенереной темп папки для конкретного файла
        options: undefined
      };
      this.stage_1 = {
        // индекс массива это состояние (0 - откодирован, 1 - с ошибкой, 2 - в процессе, 3 - ожидает)
        // объект в массиве: key - id воркера, value - Set из частей
        currentTranscode: [{}, {}, {}, new Set()],
        lastPart: undefined
      };
      this.stage_2 = {
        workerID: undefined
      };
      this.status = 3; // 0 - OK, 1 - ERR, 2 - ENCODING, 3 - PENDING, 4 - DELETED by USER, 5 - moving
      this.stage = 0; // Это этап кодирования; 0 - подготавливается, 1 - кодируется, 2 - склеивается
      this.duration = undefined;
      this.progressOnStage_1 = [];
      this.totalPercent = 0;
      this.priority = categoryModel.getPriorityById(this.category); // чем ниже тем более приоритетен файл
    }

    // функция трансформирует данные для отправки на воркер. Все ненужные поля вырезаются
    // остальное адаптируется для конкретной стадии
    transformFileData(partsToTranscode) {
      const newFileData = {};
      // данные независимые от стадии файла
      Object.assign(newFileData, {
        id: this.id,
        stage: this.stage,
        fileName: this.fileName,
        category: this.category  // по id категории сопостовляется выходной путь и пресет
      });

      // в зависимости от стадии файла, воркеру нужны разные данные
      switch (this.stage) {
        case 0:
          Object.assign(newFileData, {
            extension: this.extension,
            sourcePath: this.sourcePath,
            startTime: this.startTime,
            endTime: this.endTime
          });
          break;
        case 1:
          Object.assign(newFileData, {
            extension: this["stage_0"].extension,
            tempRootPath: this["stage_0"].tempRootPath,
            options: JSON.parse(JSON.stringify(this["stage_0"].options)),
            keyFrameInterval: this["stage_0"].keyFrameInterval,
            lastPart: this["stage_1"].lastPart,
            partSuffix, // для добавления к названию части
            partsToTranscode
          });
          break;
        case 2:
          Object.assign(newFileData, {
            tempRootPath: this["stage_0"].tempRootPath,
            duration: this.duration, // нужно для расчета totalFrames, для прогресбара
            numberOfParts: this["stage_1"].lastPart + 1, // нужно для воссоздания сортированного списка файлов
            partSuffix, // для воссоздания списка файлов
          });
          break;
      }
      return newFileData;
    }

    // функция лочит файл или его части и после истечения определенного времени
    // если не было получено подтверждение со стороны воркера возвращает состояние назад
    // Возвращает в случае успеха timerID, в случае неудачи -1
    lockFile(workerID, parts) {
      if (
        ((this.stage === 0 || this.stage === 2) && this.status === 2) ||
        (this.stage === 1 && parts === undefined)
      ) {
        return -1;
      }
      if (!(workerID in this.lockFileTimerId)) {
        this.lockFileTimerId[workerID] = {};
      }
      const timerID = Date.now();

      const clearTimerID = () => {
        delete this.lockFileTimerId[workerID][timerID];
        if (Object.keys(this.lockFileTimerId[workerID]).length === 0) {
          delete this.lockFileTimerId[workerID];
        }
      };
      // рассматриваем разные случаи
      if (this.stage === 0 || this.stage === 2) {
        this[`stage_${this.stage}`].workerID = workerID;
        this.status = 2;
        // устанавливаем таймер
        this.lockFileTimerId[workerID][timerID] = setTimeout((function() {
          console.log('\x1b[33m%s\x1b[0m', `Файловый таймер! ID = ${this.id}`);
          // вдруг файл уже удалили?
          if (this) {
            // возвращаем как было
            this[`stage_${this.stage}`].workerID = undefined;
            this.status = 3;
            // удаляем ключ и значение за собой
            clearTimerID();
            informClients("UPDATEFILE", this.filterFileData());
          }
        }).bind(this), lockTime);
      } else {
        const pendingParts = new Set(this["stage_1"].currentTranscode[3]);
        // берем ссылку на объект {workerID: Set(parts))
        const progressParts = this["stage_1"].currentTranscode[2];
        const newProgressParts =
          workerID in progressParts
            ? new Set(progressParts[workerID])
            : new Set(); // это Set из частей, которые в данный момент в состоянии 2(кодируются)

        for (let part of parts) {
          // если часть не была удалена -> значит ее там не было, это считается ошибкой
          if (!pendingParts.delete(part)) {
            return -1;
          }
          newProgressParts.add(part);
        }
        // если цикл прошел успешно значит всё было в соотвествии и можно переназначить Set'ы
        this["stage_1"].currentTranscode[3] = pendingParts;
        this["stage_1"].currentTranscode[2][workerID] = new Set(
          newProgressParts
        );
        this.status = 2;

        // устанавливаем таймер который после срабатывания вернет все назад
        this.lockFileTimerId[workerID][timerID] = setTimeout((function() {
          if (this) {
            // это не копии а ссылки на объекты Set, т.к отката нет, работаем "in place"
            const pendingParts = this["stage_1"].currentTranscode[3];
            // если воркер был отключен и эта инфа поступила на сервер
            // сервер сделает "releaseFiles" которая удалит связи воркера и файла
            // надо удостовериться что связь есть
            let progressParts = undefined;
            if (workerID in this["stage_1"].currentTranscode[2]) {
              progressParts = this["stage_1"].currentTranscode[2][workerID];
            }
            for (let part of parts) {
              pendingParts.add(part);
              if (progressParts) progressParts.delete(part);
            }
            // удаляем все свойство если Set с частями в процессе пустой
            if (progressParts && progressParts.size === 0) {
              delete this["stage_1"].currentTranscode[2][workerID];
            }
            // если никакая из частей в данный момент не кодируется, можем поставить статус "3"
            if (Object.keys(this["stage_1"].currentTranscode[3]).length === 0) {
              this.status = 3;
            }
            // удаляем ключ и значение за собой
            clearTimerID();
            // оповещаем фронтэнд
            informClients("UPDATEFILE", this.filterFileData());
          }
        }).bind(this), lockTime);
      }

      // оповещаем фронтэнд
      informClients("UPDATEFILE", this.filterFileData());
      return timerID;
    }
    // возвращает процент завершения кодирования файла,
    // также устанавливает значения кодирования отдельных частей
    calculateFileProgress({ progress, part }) {
      switch (this.stage) {
        case 0:
          return Math.round(0.1 * progress);
        case 1:
          if (typeof part === undefined) return;
          this.progressOnStage_1[part] = progress;
          return (
            10 +
            Math.round(
              this.progressOnStage_1.reduce((sum, next) => {
                return sum + next;
              }, 0) * 0.7 / this.progressOnStage_1.length
            )
          );
        case 2:
          return Math.round(80 + 0.2 * progress);
      }
    }

    // готовит данные для фронтэнда
    filterFileData() {
      const workers = [];
      switch (this.stage) {
        case 0:
          if (this["stage_0"].workerID) {
            workers.push(this["stage_0"].workerID);
          }
          break;
        case 1:
          const ids = Object.keys(this["stage_1"].currentTranscode[2]);
          if (ids.length > 0) {
            workers.push(...ids);
          }
          break;
        case 2:
          if (this["stage_2"].workerID) {
            workers.push(this["stage_2"].workerID);
          }
          break;
      }
      return {
        id: this.id,
        fileName: this.fileName,
        extension: this.extension,
        size: this.size,
        category: this.category,
        duration: this.duration,
        status: this.status,
        stage: this.stage,
        progress: this.totalPercent,
        workers
      };
    }

    acknowledgeFile(workerID, timerID) {
      if (!(workerID in this.lockFileTimerId)) return;
      if (!(timerID in this.lockFileTimerId[workerID])) return;
      clearTimeout(this.lockFileTimerId[workerID][timerID]);
      delete this.lockFileTimerId[workerID][timerID];
      if (Object.keys(this.lockFileTimerId[workerID]).length === 0) {
        delete this.lockFileTimerId[workerID];
      }
    }

    partsToTranscode() {
      return Array.from(this["stage_1"].currentTranscode[3]);
    }
  }

  return new (class {
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

    // "отпускает" файл, т.е меняет состояние на "в ожидании" и в зависимости от
    // стадии убирает worker_id. Функция нужна для случайного дисконнект воркера
    // или удаления воркера во время кодирования
    releaseFiles(fileIDs, workerID) {
      if (fileIDs.length === 0) return;
      for (const id of fileIDs) {
        const file = this.getFileById(id);
        if (!file) {
          continue;
        }
        // гасит активные таймеры
        if (workerID in file.lockFileTimerId) {
          const timerIDs = Object.keys(file.lockFileTimerId[workerID]);
          for (const timerID of timerIDs) {
            file.acknowledgeFile(workerID, timerID);
          }
        }
        switch (file.stage) {
          case 1:
            if (workerID in file["stage_1"].currentTranscode[2]) {
              const parts = file["stage_1"].currentTranscode[2][workerID];
              // перерасчитываем проценты готовности файла
              for (const part of parts) {
                this.updateFileProgressById({
                  id,
                  progress: 0,
                  part
                });
                // запихиваем части обратно в "ожидающие"
                file["stage_1"].currentTranscode[3].add(part);
              }

              delete file["stage_1"].currentTranscode[2][workerID];
              if (
                Object.keys(file["stage_1"].currentTranscode[2]).length === 0
              ) {
                file.status = 3;
                informClients("UPDATEFILE", {
                  id,
                  status: 3
                });
              }
            }
            break;
          case 0:
          case 2:
            file[`stage_${file.stage}`].workerID = undefined;
            file.status = 3;
            informClients("UPDATEFILE", {
              id,
              status: 3
            });
            this.updateFileProgressById({
              id,
              progress: 0
            });
        }
      }
    }
    // обновляет totalPercent и оповещаем фронт
    updateFileProgressById({ id, progress, part }) {
      const fileToUpdate = this.getFileById(id);
      if (!fileToUpdate) {
        return;
      }
      const totalPercent = fileToUpdate.calculateFileProgress({
        progress,
        part
      });
      // вариант дебаунса, чтобы лишний раз не гонять данные по сети
      if (totalPercent !== fileToUpdate.totalPercent) {
        fileToUpdate.totalPercent = totalPercent;
        informClients("UPDATEFILE", {
          id,
          progress: totalPercent
        });
      }
    }

    deleteFileById(id) {
      const fileToDelete = this.getFileById(id);
      if (!fileToDelete) {
        return;
      }
      const operationalWorker = outerMethods["getAnyOperationalWorker"]();
      // если ни одного работающего воркера не найдено, выходим из функции
      if (!operationalWorker) return;
      // Четыре варианта события:
      // 1) Файл полность откодирован или вылетел с ошибкой
      // 2) Файл не начинал кодироваться т.к все воркеры заняты
      // 3) Файл частично откодирован, но сейчас находится в ожидании
      // 4) Файл в данный момент кодируется
      if (fileToDelete.status === 2) {
        if (fileToDelete.stage === 0 || fileToDelete.stage === 2) {
          const workerID = fileToDelete[`stage_${fileToDelete.stage}`].workerID;
          const worker = outerMethods["getWorkerById"](+workerID);
          if (worker) {
            worker.stopConversion(id);
          }
        }
        if (fileToDelete.stage === 1) {
          const workerIDs = Object.keys(
            fileToDelete["stage_1"].currentTranscode[2]
          );
          for (let workerID of workerIDs) {
            workerID = parseInt(workerID);
            const worker = outerMethods["getWorkerById"](workerID);
            if (worker) {
              worker.stopConversion(id);
            }
          }
        }

        fileToDelete.status = 4;
        // выходим из функции при таком раскладе, мы не можем удалить кодируемый
        // в данный момент файл, нужно дождаться остановки код-я
        return;
      }

      if (fileToDelete.status === 3) {
        fileToDelete.status = 4;
      }
      // если файл полностью разблокирован от кодирования в настоящий момент, можно удалять
      if (
        fileToDelete.status === 0 ||
        fileToDelete.status === 1 ||
        (
          fileToDelete.status === 4 &&
          Object.keys(fileToDelete["stage_1"].currentTranscode[2])
        ).length === 0
      ) {
        // // сделать зачистку файлов на ФС
        // собираем объект в котором будут данные о том что надо стереть
        const fileData = {};
        fileData.sourceFile = {};
        fileData.destinationFile = {};

        fileData.sourceFile.sourcePath = fileToDelete.sourcePath;
        fileData.sourceFile.fileName = fileToDelete.fileName;
        fileData.sourceFile.extension = fileToDelete.extension;

        // если файл был удален пользователем, то надо узнать
        // на какой стадии был файл. Если на "2"(склейка)
        // то надо удалить еще и созданный файл назначения
        // На стороне воркера, проверим если объект outputFile
        // не равен undefined, то удалим еще и файл назначения
        if (fileToDelete.status === 4 && fileToDelete.stage === 2) {
          fileData.outputFile = {};
          fileData.outputFile.category = fileToDelete.category;
          fileData.outputFile.fileName = fileToDelete.fileName;
          fileData.outputFile.extension = ".mxf";
        }

        fileData.tempRootPath = fileToDelete["stage_0"].tempRootPath;
        operationalWorker.deleteFiles(fileData);

        const indexOfFile = this.storage.findIndex(file => file.id === id);
        // обновляем инфу о файле перед удалением, это то что пойдет в логи
        fileToDelete.finished_at = this.getFormatedDateTime();

        const asyncOperations = [];
        // если была ошибка, текст ошибки вместе с внешним ID, который равен file.id
        // вставляем в БД
        if (fileToDelete.errorMessage) {
          asyncOperations.push(
            db.addError({
              log_id: id,
              errorMessage: fileToDelete.errorMessage
            })
          );
        }
        asyncOperations.push(
          db.updateLog({
            id,
            status: fileToDelete.status,
            duration: fileToDelete.duration,
            processing_at: fileToDelete.processing_at,
            finished_at: fileToDelete.finished_at,
            workers: JSON.stringify({
              stage_0: fileToDelete["stage_0"].workerID,
              stage_1: Object.keys(fileToDelete["stage_1"].currentTranscode[0]),
              stage_2: fileToDelete["stage_2"].workerID
            })
          })
        );
        // ждем выполнения промисов
        Promise.all(asyncOperations)
          .then(() => {
            // удалить из памяти
            this.storage.splice(indexOfFile, 1);
            informClients("DELETEFILE", id);
          })
          .catch(e => {
            console.log("Ошибка в deleteFileById ", e);
          });
      }
    }

    getFormatedDateTime() {
      const date = new Date();
      return `${date.getFullYear()}-${date.getMonth() +
        1}-${date.getDate()} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
    }

    async addFile(data) {
      // исключаем возможность обработки дубликата файла(по имени файл и расширению)
      for (const file of this.storage) {
        if (data.fileName === file.fileName && data.extension === file.extension) {
          return;
        }
      }
      
      try {
        const id = await db.addLog(data);
        const file = new File({
          ...data,
          id
        });
        this.storage.push(file);
        // сразу оповещаем фронтенд новым файлом
        informClients("ADDFILE", file.filterFileData());
      } catch (e) {
        console.log("Ошибка в функции addFile", e.message);
      }
    }

    // функция выдает файлы ожидающие обработки, сортируя массив в обратном порядке
    // Чем больше значение stage тем приоритетней файл
    getPendingFile() {
      const files = [];
      for (const file of this.storage) {
        // файл находится в процессе удаления или произошла ошибка
        if (file.status === 4 || file.status === 1) continue;
        if (
          (file.stage === 0 && file["stage_0"].workerID === undefined) ||
          (file.stage === 1 && file["stage_1"].currentTranscode[3].size > 0) ||
          (file.stage === 2 && file["stage_2"].workerID === undefined)
        ) {
          files.push(file);
        }
      }

      if (files.length > 1) {
        // сортируем чтобы в конце были самые приоритетные
        files.sort((a, b) => {
          const priority = b.priority - a.priority;
          return priority === 0 ? b.id - a.id : priority;
        });
      }
      return files.pop();
    }
    // принимает переменное кол-во параметров передаваемых в объекте file
    updateFile(file) {
      const fileToUpdate = this.getFileById(file.id);
      if (fileToUpdate === -1) return;
      // нужно обезопасить апдейт от дубликатов сообщений об ошибке файла
      // такие ошибки будут сыпаться с нескольких обработчиков если неудача
      // случилась на этапе 1
      if (!fileToUpdate || fileToUpdate.status === 1 && file.status === 1) return;
      const updateHelper = (target, source, nested = false) => {
        for (let prop in source) {
          if (prop in target || nested) {
            if (typeof source[prop] === "object") {
              if (!target[prop]) {
                target[prop] = {};
              }
              updateHelper(target[prop], source[prop], true);
            } else {
              target[prop] = source[prop];
            }
          }
        }
      };
      // обновляем свойства объекта FILE данными из объекта file.
      // Обновляем рекурсивно и только те сво-ва верхоуровневые
      // ключи которых есть и там и там
      updateHelper(fileToUpdate, file);

      // фунция для удаления откодированных или остановленных частей
      // из списка "активных" возвращает true если активных частей
      // больше нет, в противном случае false
      const completeParts = (file, workerID, parts) => {
        if (workerID in file["stage_1"].currentTranscode[2]) {
          if (!(workerID in file["stage_1"].currentTranscode[0])) {
            file["stage_1"].currentTranscode[0][workerID] = new Set();
          }
          // удаляем откодированные части из Set в категории "части в процессе"
          // переносим их в раздел откодированных
          for (const part of parts) {
            file["stage_1"].currentTranscode[2][workerID].delete(part);
            file["stage_1"].currentTranscode[0][workerID].add(part);
          }
          // если Set соотвествующий workerID ключу пустой, удаляем и ключ
          if (file["stage_1"].currentTranscode[2][workerID].size === 0) {
            delete file["stage_1"].currentTranscode[2][workerID];
          }
          return Object.keys(file["stage_1"].currentTranscode[2]).length === 0;
        }
      };
      // прописываем логику на все случаи:
      // у файла меняется статус
      if ("status" in file) {
        // файл перешел в состояние "в процессе"
        if (file.status === 2 && fileToUpdate.processing_at === undefined) {
          fileToUpdate.processing_at = this.getFormatedDateTime();
        } else if (file.status === 0 || file.status === 1) {
          // файл откодировался или вылетел с ошибкой
          this.deleteFileById(file.id);
        } else if (file.status === 4) {
          // "останавливающийся файл"
          // если файл был отменен, важно знать на какой стадии кодирования он был
          // если эта стадия 1(кодирование по частям), нам нужно чтобы все части
          // файла были остановлены, прежде чем его полностью удалить из ФС
          if (fileToUpdate.stage === 1) {
            const workerID = file.workerID;
            if (workerID in fileToUpdate["stage_1"].currentTranscode[2]) {
              delete fileToUpdate["stage_1"].currentTranscode[2][workerID];
              const remainingActiveParts = Object.keys(
                fileToUpdate["stage_1"].currentTranscode[2]
              ).length;
              // если активно кодирующихся частей больше нет, удаляем файл
              if (remainingActiveParts === 0) {
                this.deleteFileById(file.id);
              }
            }
          } else {
            this.deleteFileById(file.id);
          }
        }
      }
      // это файл после окончания 0 ступени
      if ("stage_0" in file) {
        const numberOfParts = Math.floor(
          fileToUpdate.duration / fileToUpdate["stage_0"].keyFrameInterval
        );

        // устанавливаем значение последней части,
        // это надо чтобы откодировать "хвост"
        fileToUpdate["stage_1"].lastPart = numberOfParts - 1;
        // заполняем Set соотвествующий состоянию pending
        // кол-ом частей которые надо откодировать
        fileToUpdate["stage_1"].currentTranscode[3] = new Set(
          Array.from(Array(numberOfParts), (_, index) => index)
        );
        // создаем массив с кол-во элементов равным кол-ву
        // частей для регистрации прогресса кодирования на stage = 1
        fileToUpdate.progressOnStage_1 = new Array(numberOfParts).fill(0);
        // переводим файл со ступени 0 на ступень 1
        fileToUpdate.stage = 1;
      }
      if ("stage_1" in file) {
        // это файл в состоянии кодирования по частям,
        // нужно вычислить когда все части откодируются и перевести
        // файл на следующую ступень
        const workerID = file.workerID;
        const transcodedParts = file["stage_1"].transcodedParts;
        // проверяем если нет активно кодируемых частей, то ставим статус 3
        if (
          completeParts(fileToUpdate, workerID, transcodedParts) &&
          fileToUpdate.status !== 4
        ) {
          fileToUpdate.status = 3;
          // и если ко всему прочему еще и не осталось ожидающих код-ия частей
          // то переводим файл на нувую ступень
          if (fileToUpdate["stage_1"].currentTranscode[3].size === 0) {
            fileToUpdate.stage = 2;
          }
        }
      }
      informClients("UPDATEFILE", fileToUpdate.filterFileData());
    }
  })();
})();
