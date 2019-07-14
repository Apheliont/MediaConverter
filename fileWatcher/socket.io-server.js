const port = process.env.PORT || 3002;
const server = require("http").createServer();
const io = require("socket.io")(server, {
  pingTimeout: 5000,
  pingInterval: 7000,
  path: "/watcher"
});

server.listen(port, () => {
  console.log(`Наблюдатель готов и слушает порт: ${port}`);
});

module.exports = io;