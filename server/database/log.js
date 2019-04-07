const getLogsQuery = `SELECT * FROM logs AS logs`;


module.exports = function (pool) {
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
    return {
        getLogs
    }
}