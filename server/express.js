const port = process.env.PORT || 8081;
const path = require("path");
const express = require("express");
const app = express();
const bodyParser = require("body-parser");

const server = require("http").createServer(app);

const categoryRoutes = require("./routes/category");
const fwpathRoutes = require("./routes/fwpath");
const fileRoutes = require("./routes/file");
const workerRoutes = require("./routes/worker");
const watcherRoutes = require("./routes/watcher");
const settingsRoutes = require("./routes/settings");
const logRoutes = require("./routes/log");
const errorRoutes = require("./routes/error");

const allowCrossDomain = function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE");
    res.header("Access-Control-Allow-Headers", "file-name, content-type");
    next();
};

app.use(express.static(path.join(__dirname, "public")));
app.use(allowCrossDomain);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use("/api/categories", categoryRoutes);
app.use("/api/fwpaths", fwpathRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/workers", workerRoutes);
app.use("/api/watchers", watcherRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/logs", logRoutes);
app.use("/api/errors", errorRoutes);

app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

server.listen(port, () => {
    console.log(`Server is listining on port ${port}`);
});


module.exports = {
    server
};