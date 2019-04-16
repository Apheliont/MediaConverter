const { pool } = require('./main');
const { workerModel, fileModel } = require("../models/fileWorkerFusion");

const createFilesQuery = `CREATE TABLE IF NOT EXISTS files(
    id INT AUTO_INCREMENT PRIMARY KEY,
    fileName VARCHAR(255) NOT NULL,
    extension VARCHAR(5) NOT NULL,
    size BIGINT NOT NULL,
    duration INT,
    category TINYINT NOT NULL,
    created_at TIMESTAMP,
    processing_at TIMESTAMP,
    finished_at TIMESTAMP,
    status TINYINT DEFAULT 3,
    workerID TINYINT)`;

const createLogsQuery = `CREATE TABLE IF NOT EXISTS logs(
    id INT AUTO_INCREMENT PRIMARY KEY,
    file_id INT NOT NULL,
    fileName VARCHAR(255) NOT NULL,
    extension VARCHAR(5) NOT NULL,
    size BIGINT NOT NULL,
    duration INT,
    category TINYINT NOT NULL,
    created_at TIMESTAMP,
    processing_at TIMESTAMP,
    finished_at TIMESTAMP,
    status TINYINT,
    workerID TINYINT)`;

const createCategoriesQuery = `CREATE TABLE IF NOT EXISTS categories(
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    path VARCHAR(255) NOT NULL
)`;

const createWorkersQuery = `CREATE TABLE IF NOT EXISTS workers(
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    host VARCHAR(255) NOT NULL,
    port SMALLINT NOT NULL,
    tempFolder VARCHAR(255) NOT NULL,
    sourceFolder VARCHAR(255) NOT NULL,
    autoConnect BOOLEAN DEFAULT true,
    description TEXT
)`;

const deleteFileTrigger = `
CREATE TRIGGER log_deleted_files
AFTER DELETE ON files FOR EACH ROW
BEGIN
INSERT INTO logs SET file_id = OLD.id,
fileName = OLD.fileName,
extension = OLD.extension,
size = OLD.size,
duration = OLD.duration,
category = OLD.category,
created_at = OLD.created_at,
processing_at = OLD.processing_at,
finished_at = OLD.finished_at,
status = OLD.status,
workerID = OLD.workerID;
END;
`;

const clearOldLogs = `
CREATE EVENT IF NOT EXISTS clearLogs
    ON SCHEDULE
        EVERY 1 DAY STARTS NOW()
    COMMENT 'clearing log entities those are older than one week'
    DO
        DELETE FROM logs WHERE created_at < DATE_SUB(NOW(), INTERVAL 3 DAY)`;

function makeQuery(pool) {
  return function (query) {
    return new Promise((resolve, reject) => {
      pool.query(query, function (err, results, fields) {
        if (err) {
          reject(err)
        }
        resolve();
      });
    });
  }
}

module.exports = function init() {
    const helper = () => {
      pool.getConnection(async (err, connection) => {
        if (err) {
          setTimeout(() => {
            helper();
          }, 2000);
          console.log(
            "Connection failed, trying to reconnect...",
            err.message
          );
        } else {
          console.log("Connection established");
          connection.on("error", () => {
            helper();
          });
          const query = makeQuery(pool);
          await Promise.all([
            query(createFilesQuery),
            query(createLogsQuery),
            query(createCategoriesQuery),
            query(createWorkersQuery),
            query(clearOldLogs),
            query("DROP TRIGGER IF EXISTS log_deleted_files").then(() =>
              query(deleteFileTrigger)
            )
          ]);
          await workerModel.restoreWorkers();
          await fileModel.restoreFiles();
        }
      });
    };
    helper();
};
