/*
 ** Микросервис для отслеживания изменений в папках и отправки данных на REST API Endpoint
 ** Для работы в составе MediaConverter
 */

const fs = require("fs");
const fsPromise = fs.promises;
const path = require("path");
const http = require("http");

// -----------------------CONFIG-------------------------
const bytesPerSecond = 80 * 1024 * 1024;
const sources = [
  ["\\\\media\\v\\Transcode_Internet", 4],
  ["\\\\media\\v\\Transcode_Agentstva", 2],
  ["\\\\media\\v\\Transcode_GlavnayaRol", 3],
  ["\\\\media\\v\\Transcode_Kor_Set", 5],
  ["\\\\media\\v\\Transcode_Nabludatel", 6],
  ["\\\\media\\v\\Transcode_Vesti", 7]
];
const options = {
  host: "vbram",
  port: 80,
  path: "/api/files/watched",
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  }
};
// ------------------------------------------------------

function fileWatcher(sources) {
  function setWatcher(source) {
    const sourcePath = source[0];
    const category = source[1];

    fs.watch(sourcePath, async (event, fullName) => {
      if (event !== "rename" || !fullName) {
        return;
      }

      try {
        // костыль для того чтобы начальный stat.size не был равен 0
        await new Promise(resolve => setTimeout(resolve, 1000));
        const firstProbe = await fsPromise.stat(
          path.join(sourcePath, fullName)
        );
        const indexOfDot = fullName.lastIndexOf(".");
        if (indexOfDot === -1) {
          return;
        }
        const fileName = fullName.slice(0, indexOfDot);
        const extension = fullName.slice(indexOfDot);

        const delayTime =
          Math.ceil(firstProbe.size / bytesPerSecond) * 1000 + 5000; // 5 сек доп дебаунс
        await new Promise(resolve => setTimeout(resolve, delayTime));
        const secondProbe = await fsPromise.stat(
          path.join(sourcePath, fullName)
        );

        const fileObj = {
          category,
          fileName,
          sourcePath,
          extension,
          size: secondProbe.size
        };
        console.log("----------------------------------");
        console.log("Новый файл: ", `${fileObj.fileName}${fileObj.extension}`);
        console.log("Путь: ", fileObj.sourcePath);
        console.log("Размер: ", `${Math.round(fileObj.size / (1024 * 1024))} Mb`);
        console.log("----------------------------------");

        const req = http.request(options);
        req.write(JSON.stringify(fileObj));
        req.end();
      } catch (e) {
        // ошибки никака не обрабатываем т.к это будут ошибки на отсутствующие файлы -> они не важны
      }
    });
  }

  sources.forEach(source => {
    setWatcher(source);
  });
}

fileWatcher(sources);
