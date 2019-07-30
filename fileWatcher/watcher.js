const fs = require("fs");
const fsPromise = fs.promises;
const path = require("path");
const io = require("./socket.io-server");

module.exports = new (class {
  constructor() {
    this.watchers = []; // массив объектов класса fs.FSWatcher
  }
  setWatchers(fwpaths) {
    // перед тем как установить новые наблюдатели, нужно "потушить" старые
    this.clearWatchers();

    const setWatcher = fwdata => {
      // @@source: Object{id: int, path: string, delay: int, netSpeed:int, category: int}
      this.watchers.push(
        fs.watch(fwdata.path, async (event, fullName) => {
          if (event !== "rename" || !fullName) {
            return;
          }

          try {
            // костыль для того чтобы начальный stat.size не был равен 0
            await new Promise(resolve => setTimeout(resolve, 1000));
            const firstProbe = await fsPromise.stat(
              path.join(fwdata.path, fullName)
            );
            const indexOfDot = fullName.lastIndexOf(".");
            if (indexOfDot === -1) {
              return;
            }
            const fileName = fullName.slice(0, indexOfDot);
            const extension = fullName.slice(indexOfDot);
            // время задержки после которого вотчер отправит инфу серверу что файл на месте
            // если к этому времени файл не будет докачан до конца, будет ошибка конвертации
            // параметры нужно подбирать экспериментальным путем
            // Math.pow(10, -3) это приближенное значение от выражения 1000ms * 1 / 1024 ** 2
            const delayTime =
              Math.ceil(firstProbe.size / fwdata.netSpeed) * 0.001 +
              fwdata.delay * 1000;
            await new Promise(resolve => setTimeout(resolve, delayTime));
            const secondProbe = await fsPromise.stat(
              path.join(fwdata.path, fullName)
            );

            const fileObj = {
              fileName,
              extension,
              sourcePath: fwdata.path,
              category: fwdata.category,
              size: secondProbe.size
            };
            console.log("----------------------------------");
            console.log(
              "Новый файл: ",
              `${fileObj.fileName}${fileObj.extension}`
            );
            console.log("Путь: ", fileObj.sourcePath);
            console.log(
              "Размер: ",
              `${Math.round(fileObj.size / (1024 * 1024))} Mb`
            );
            console.log("----------------------------------");

            io.emit("newFile", fileObj);
          } catch (e) {
            // ошибки никака не обрабатываем т.к это будут ошибки на отсутствующие файлы -> они не важны
          }
        })
      );
    };

    for (const fwdata of fwpaths) {
      // проверяем существование пути
      fsPromise
        .access(fwdata.path)
        .then(() => setWatcher(fwdata))
        .catch(e => {
          // такого пути нет, ошибка будет отображена на фронте
        });
    }
  }
  clearWatchers() {
    this.watchers.forEach(watcher => watcher.close());
    this.watchers = [];
  }
})();
