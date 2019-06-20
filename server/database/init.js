const { pool } = require("./main");
const { workerModel } = require("../models/fileWorkerFusion");

const createLogsQuery = `CREATE TABLE IF NOT EXISTS logs(
    id INT AUTO_INCREMENT PRIMARY KEY,
    fileName VARCHAR(255) NOT NULL,
    extension VARCHAR(5) NOT NULL,
    size BIGINT UNSIGNED NOT NULL,
    duration INT UNSIGNED,
    category TINYINT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    processing_at TIMESTAMP,
    finished_at TIMESTAMP,
    status TINYINT UNSIGNED DEFAULT 3,
    workers JSON
)`;

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
    sourcePath VARCHAR(255) NOT NULL,
    autoConnect BOOLEAN DEFAULT true,
    description TEXT
)`;

const createErrorsQuery = `CREATE TABLE IF NOT EXISTS errors(
  id INT AUTO_INCREMENT PRIMARY KEY,
  log_id INT,
  errorMessage TEXT,
  FOREIGN KEY(log_id) REFERENCES logs (id) ON DELETE CASCADE
)`;

const clearOldLogs = `
CREATE EVENT IF NOT EXISTS clearLogs
    ON SCHEDULE
        EVERY 1 DAY STARTS NOW()
    COMMENT 'clearing log entities those are older than one week'
    DO
        DELETE FROM logs WHERE created_at < DATE_SUB(NOW(), INTERVAL 7 DAY)`;

function makeQuery(pool) {
  return function(query) {
    return new Promise((resolve, reject) => {
      pool.query(query, function(err, results, fields) {
        if (err) {
          reject(err);
        }
        resolve();
      });
    });
  };
}

module.exports = function init() {
  const helper = () => {
    pool.getConnection(async (err, connection) => {
      if (err) {
        setTimeout(() => {
          helper();
        }, 2000);
        console.log("Connection failed, trying to reconnect...", err.message);
      } else {
        console.log("Connection established");
        connection.on("error", () => {
          helper();
        });
        const query = makeQuery(pool);
        await Promise.all([
          query(createLogsQuery),
          query(createErrorsQuery),
          query(createCategoriesQuery),
          query(createWorkersQuery),
          query(clearOldLogs)
        ]);
        await workerModel.restoreWorkers();
      }
    });
  };
  helper();
};
