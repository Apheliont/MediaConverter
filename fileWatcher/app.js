/*
 ** Микросервис для отслеживания изменений в папках
 ** Для работы в составе MediaConverter
 */
require("dotenv").config(".env");
const io = require("./socket.io-server");
const watcher = require("./watcher");

function init() {
  io.on("connection", socket => {
    socket.on("fwpaths", fwpaths => {
      watcher.setWatchers(fwpaths);
    });
    socket.on("disconnect", () => {
      watcher.clearWatchers();
    });
  })
}

init();