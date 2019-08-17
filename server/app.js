require("dotenv").config("./.env");
require("./clientUpdater");
const { socketIOSetup } = require("./socket.io-server");
const { server } = require("./express");
const initDB = require('./database/init');

socketIOSetup(server);
initDB();
