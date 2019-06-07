const fsPromise = require("fs").promises;
const util = require("util");
const path = require("path");
const db = require("../database/main");
const settings = require("./settings");
let { informClients } = require("../socket.io-server");
informClients = informClients("FILEINFO");
const rimraf = util.promisify(require("rimraf")); // удаляет дирректорию рекурсивно

module.exports = (function() {
  const lockFileTimerId = {}; // хранит ID сопоставимые в объект Timeout для сброса таймеров
  const lockTime = 7000; // время на которое лочится файл
  const outerMethods = {};

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
      // Начальные данные
      this.id = id;
      this.fileName = fileName;
      this.extension = extension;
      this.size = size;
      this.sourcePath = sourcePath;
      this.fileTempPath = undefined; // путь к темп папке в которой будут производится все манипуляции с файлом
      this.category = category;
      this.startTime = startTime || "00:00:00";
      this.endTime = endTime || "00:00:00";
      this.processing_at = undefined;
      this.finished_at = undefined;
      this.errorMessage = undefined;
      // данные для разных стадий
      this.stage_0 = {
        workerID: undefined,
        keyFrameInterval: undefined,
        extension: undefined,
        sourcePath: undefined,
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
      this.status = 3; // 0 - OK, 1 - ERR, 2 - ENCODING, 3 - PENDING, 4 - DELETED by USER
      this.stage = 0; // Это этап кодирования; 0 - подготавливается, 1 - кодируется, 2 - склеивается
      this.duration = undefined;
      this.progressOnStage_1 = [];
      this.totalPercent = 0;
    }

    // функция трансформирует данные для отправки на воркер. Все ненужные поля вырезаются
    // остальное адаптируется для конкретной стадии
    transformFileData(partsToTranscode) {
      const newFileData = {};
      // данные независимые от стадии файла
      Object.assign(newFileData, {
        id: this.id,
        stage: this.stage,
        fileName: this.fileName
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
            sourcePath: this["stage_0"].sourcePath,
            options: JSON.parse(JSON.stringify(this["stage_0"].options)),
            keyFrameInterval: this["stage_0"].keyFrameInterval,
            lastPart: this["stage_1"].lastPart,
            partsToTranscode
          });
          break;
        case 2:
          Object.assign(newFileData, {
            sourcePath: path.join(this["stage_0"].sourcePath, "..", "parts"), // статично прописанный путь! Если будут изменения пути в коде воркера, то и тут надо изменить!
            category: this.category // по id категории сопостовляется выходной путь
          });
          break;
      }
      return newFileData;
    }
    // удаляет исходный файл с ФС, возвращает промис
    clearSourceFile() {
      const sourcePath = this.soucePath
        ? this.soucePath
        : settings.get("uploadPath");
      return fsPromise.unlink(
        path.join(sourcePath, `${this.fileName}${this.extension}`)
      );
    }
    // удаляет Temp папку файла и все находящиеся там файлы
    clearTempFolder() {
      if (!this.fileTempPath) {
        return Promise.reject("У файла нет Temp папки");
      }
      return rimraf(this.fileTempPath);
    }
    // функция лочит файл или его части и после истечения определенного времени
    // если не было получено подтверждение со стороны воркера возвращает состояние назад
    // Возвращает в случае успеха timerID, в случае неудачи -1
    lockFile(workerID, parts) {
      const timerID = Date.now();

      // рассматриваем разные случаи
      if (this.stage === 0) {
        if (this.status === 2) return -1;
        this["stage_0"].workerID = workerID;
        this.status = 2;
        // устанавливаем таймер
        lockFileTimerId[timerID] = setTimeout(() => {
          if (this) {
            // возвращаем как было
            this["stage_0"].workerID = undefined;
            this.status = 3;
            // удаляем ключ и значение за собой
            delete lockFileTimerId[timerID];
            informClients("UPDATEFILE", this.filterFileData());
          }
        }, lockTime);
      }
      // если пытаемся залочить файл в стадии 1(частичное кодирование)
      // и не предоставили части
      if (this.stage === 1) {
        if (parts === undefined) return -1;
        const pendingParts = new Set(this["stage_1"].currentTranscode[3]);
        const progressParts = this["stage_1"].currentTranscode[2]; // берем ссылку на объект {workerID: Set(parts))
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
        this["stage_1"].currentTranscode[3] = new Set(pendingParts);
        this["stage_1"].currentTranscode[2][workerID] = new Set(
          newProgressParts
        );
        this.status = 2;

        // устанавливаем таймер который после срабатывания вернет все назад
        lockFileTimerId[timerID] = setTimeout(() => {
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
            delete lockFileTimerId[timerID];
            // оповещаем фронтэнд
            informClients("UPDATEFILE", this.filterFileData());
          }
        }, lockTime);
      }
      if (this.stage === 2) {
        if (this.status === 2) {
          return -1;
        }
        this["stage_2"].workerID = workerID;
        this.status = 2;
        // устанавливаем таймер
        lockFileTimerId[timerID] = setTimeout(() => {
          if (this) {
            this["stage_2"].workerID = undefined;
            this.status = 3;
            // удаляем ключ и значение за собой
            delete lockFileTimerId[timerID];
            // оповещаем фронтэнд
            informClients("UPDATEFILE", this.filterFileData());
          }
        }, lockTime);
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
              }, 0) * 0.7
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

    acknowledgeFile(timerID) {
      if (timerID in lockFileTimerId) {
        clearTimeout(lockFileTimerId[timerID]);
        delete lockFileTimerId[timerID];
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
        // сделать зачистку файлов на ФС
        fileToDelete.clearSourceFile().catch(e => {
          // не важна
        });
        fileToDelete.clearTempFolder().catch(e => {
          // не важна
        });
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
      try {
        const id = await db.addLog(data);
        const file = new File({
          ...data,
          id
        });
        this.storage.push(file);
        // сразу оповещаем фронтенд новым файлом
        informClients("ADDFILE", file.filterFileData());
        return id;
      } catch (e) {
        console.log("Ошибка в функции addFile", e.message);
      }
    }

    // функция выдает файлы ожидающие обработки, сортируя массив в обратном порядке
    // Чем больше значение stage тем приоритетней файл
    getPendingFiles() {
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
        files.sort((a, b) => a.stage - b.stage);
      }
      return files;
    }
    // принимает переменное кол-во параметров передаваемых в объекте file
    updateFile(file) {
      const fileToUpdate = this.getFileById(file.id);
      if (fileToUpdate === -1) return;
      // нужно обезопасить апдейт от дубликатов сообщений о ошибке файла
      // такие ошибки будут сыпаться с нескольких обработчиков если неудача
      // случилась на этапе 1
      if (fileToUpdate.status === 1 && file.status === 1) return;
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
        }
        // файл откодировался или вылетел с ошибкой
        if (file.status === 0 || file.status === 1) {
          this.deleteFileById(file.id);
          return;
        }
        // "останавливающийся файл"
        if (file.status === 4) {
          if ("stopConversion" in file && fileToUpdate.stage === 1) {
            const workerID = file["stopConversion"].workerID;
            const stoppedParts = file["stopConversion"].stoppedParts;
            if (completeParts(fileToUpdate, workerID, stoppedParts)) {
              this.deleteFileById(file.id);
            }
          } else {
            this.deleteFileById(file.id);
          }
          return;
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
        this.progressOnStage_1 = new Array(numberOfParts).fill(0);
        // переводим файл со ступени 0 на ступень 1
        fileToUpdate.stage = 1;
      }
      if ("stage_1" in file) {
        // это файл в состоянии кодирования по частям,
        // нужно вычислить когда все части откодируются и перевести
        // файл на следующую ступень
        const workerID = file["stage_1"].workerID;
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
