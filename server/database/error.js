const addErrorQuery = `INSERT INTO errors SET log_id = ?, errorMessage = ?`;
const getErrorQuery = `SELECT * FROM errors where log_id = ? LIMIT 1`;

module.exports = function (pool) {
    function addError({log_id, errorMessage}) {
        return new Promise((resolve, reject) => {
            pool.query(
              addErrorQuery,
              [log_id, errorMessage],
              (err, result, fields) => {
                if (err) {
                  reject(err);
                }
                resolve(result.insertId);
              }
            );
        });
  }
  
    function getError(id) {
      return new Promise((resolve, reject) => {
          pool.query(
            getErrorQuery,
            id,
            (err, result, fields) => {
              if (err) {
                reject(err);
              }
              resolve(result[0]);
            }
          );
      });
  }
  
    return {
      addError,
      getError
    };
}