const addWorkerQuery = `INSERT INTO workers SET ?`;
const deleteWorkerQuery = `DELETE FROM workers WHERE id = ?`;
const updateWorkerQuery = `UPDATE workers SET ? WHERE id = ?`;
const getWorkersQuery = `SELECT * FROM workers AS workers`;


module.exports = function (pool) {
    function addWorker(data) {
        return new Promise((resolve, reject) => {
            pool.query(addWorkerQuery, data, (err, result, fields) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(result.insertId);
                }
            });
        });
    }

    function deleteWorker(id) {
        return new Promise((resolve, reject) => {
            pool.query(deleteWorkerQuery, id, (err, result, fields) => {
                if (err) {
                    reject(err);
                }
                resolve();
            });
        });
    }

    function updateWorker(id, data) {
        return new Promise((resolve, reject) => {
            pool.query(
                updateWorkerQuery,
                [data, id],
                (err, result, fields) => {
                    if (err) {
                        reject(err);
                    }
                    resolve(result);
                }
            );
        });
    }

    function getWorkers() {
        return new Promise((resolve, reject) => {
            pool.query(getWorkersQuery, (err, result, fields) => {
                if (err) {
                    reject(err);
                }
                resolve(result);
            });
        });
    }
    return {
        getWorkers,
        updateWorker,
        deleteWorker,
        addWorker
    }
}