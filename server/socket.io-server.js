let io = null;
function socketIOSetup(server) {
  io = require("socket.io")(server, {
    pingTimeout: 5000,
    pingInterval: 7000
  });
  io.on("connection", socket => {
    socket.on("disconnect", () => {
    });
    socket.on("join", group => {
      socket.join(group);
    });
    socket.on("leave", group => {
      socket.leave(group);
    });
  });
}

function informClients(group) {
  return function (message, payload) {
    if (io) {
      io.to(group).emit(message, payload);
    }
  }
}

module.exports = {
  socketIOSetup,
  informClients
};
