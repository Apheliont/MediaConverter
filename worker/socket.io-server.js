const port = process.env.PORT || 3000;
const server = require("http").createServer();
const io = require("socket.io")(server, {
  pingTimeout: 5000,
  pingInterval: 7000,
  path: "/worker"
});

server.listen(port, () => {
  console.log(`Обработчик готов и слушает порт: ${port}`);
});

module.exports = io;