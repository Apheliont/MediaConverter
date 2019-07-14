const addWatcherQuery = `INSERT INTO watchers SET ?`;
const deleteWatcherQuery = `DELETE FROM watchers WHERE id = ?`;
const updateWatcherQuery = `UPDATE watchers SET ? WHERE id = ?`;
const getWatchersQuery = `SELECT * FROM watchers AS watchers`;


module.exports = function (pool) {
    function addWatcher(data) {
        return new Promise((resolve, reject) => {
            pool.query(addWatcherQuery, data, (err, result, fields) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(result.insertId);
                }
            });
        });
    }

    function deleteWatcher(id) {
        return new Promise((resolve, reject) => {
            pool.query(deleteWatcherQuery, id, (err, result, fields) => {
                if (err) {
                    reject(err);
                }
                resolve();
            });
        });
    }

    function updateWatcher(id, data) {
        return new Promise((resolve, reject) => {
            pool.query(
                updateWatcherQuery,
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

    function getWatchers() {
        return new Promise((resolve, reject) => {
            pool.query(getWatchersQuery, (err, result, fields) => {
                if (err) {
                    reject(err);
                }
                resolve(result);
            });
        });
    }
    return {
        getWatchers,
        updateWatcher,
        deleteWatcher,
        addWatcher
    }
}