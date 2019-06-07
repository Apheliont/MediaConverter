const getLogsQuery = `SELECT * FROM logs AS logs`;
const addLogQuery = `INSERT INTO logs SET ?`;
const updateLogQuery = `UPDATE logs SET ? WHERE id = ?`;

module.exports = function(pool) {
  function getLogs() {
    return new Promise((resolve, reject) => {
      pool.query(getLogsQuery, (err, result, fields) => {
        if (err) {
          reject(err);
        }
        resolve(result);
      });
    });
  }
  function addLog({ fileName, extension, size, category}) {
    return new Promise((resolve, reject) => {
      pool.query(
        addLogQuery,
        { fileName, extension, size, category },
        (err, result, fields) => {
          if (err) {
            reject(err);
          }
          resolve(result.insertId);
        }
      );
    });
  }

  function updateLog(data) {
    const id = data.id;
    const propsToUpdate = {};
    Object.keys(data).forEach(prop => {
      if (data[prop] !== "undefined" && prop !== "id") {
        propsToUpdate[prop] = data[prop];
      }
    });
    return new Promise((resolve, reject) => {
      pool.query(
        updateLogQuery,
        [propsToUpdate, id],
        (err, result, fields) => {
          if (err) {
            reject(err);
          }
          resolve(result);
        }
      );
    });
  }
  return {
    getLogs,
    addLog,
    updateLog
  };
};
