const settings = require("./settings");
const io = require("./socket.io-server");

// создаем инстанс апдейтера. Используется замыкание
// для контроля состояния. settings.condition.fileCommands не замыкается
// т.к передается по ссылке
const updater = createUpdater(
  settings.condition.fileCommands,
  settings.condition.fileProgress
);

settings.condition.on("newTask", () => {
  updater();
});

function createUpdater(fileCommands, fileProgress) {
  const TIME_INTERVAL = 300; // интервал отсылки данных на сервер(мс)
  let timerID = null;
  return function helper() {
    if (timerID !== null) return;
    timerID = setInterval(() => {
      if (Object.keys(fileCommands).length === 0) {
        clearInterval(timerID);
        timerID = null;
      }
      io.emit("workerResponse", {
        fileProgress: prepareData(fileCommands, fileProgress)
      });
    }, TIME_INTERVAL);
  };
}

// подготавливает данные для отправки на сервер
function prepareData(fileCommands, fileProgress) {
  // key - fileID, value - Object {part<int>: progress<int>}
  const result = {};
  for (const fileID of Object.keys(fileCommands)) {
    result[fileID] = {};
    for (const command of fileCommands[fileID]) {
      if (fileProgress.has(command)) {
        const progressObj = fileProgress.get(command);
        result[fileID][progressObj.part] = progressObj.progress;
      }
    }
  }
  return result;
}
