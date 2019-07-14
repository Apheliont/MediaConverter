const addFWPathQuery = `INSERT INTO fwpaths SET ?`;
const deleteFWPathQuery = `DELETE FROM fwpaths WHERE id = ?`;
const updateFWPathQuery = `UPDATE fwpaths SET path = ?, delay = ?, netSpeed = ?, category = ? WHERE id = ?`;
const getFWPathsQuery = `SELECT * FROM fwpaths AS fwpaths`;

module.exports = function (pool) {
    function addFWPath(data) {
        return new Promise((resolve, reject) => {
            pool.query(addFWPathQuery, data, (err, result, fields) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(result.insertId);
                }
            });
        });
    }

    function deleteFWPath(id) {
        return new Promise((resolve, reject) => {
            pool.query(deleteFWPathQuery, id, (err, result, fields) => {
                if (err) {
                    reject(err);
                }
                resolve();
            });
        });
    }

    function updateFWPath({ id, path, delay, netSpeed, category }) {
        return new Promise((resolve, reject) => {
            pool.query(
                updateFWPathQuery,
                [path, delay, netSpeed, category, id],
                (err, result, fields) => {
                    if (err) {
                        reject(err);
                    }
                    resolve(result);
                }
            );
        });
    }

    function getFWPaths() {
        return new Promise((resolve, reject) => {
            pool.query(getFWPathsQuery, (err, result, fields) => {
                if (err) {
                    reject(err);
                }
                resolve(result);
            });
        });
    }

    return {
        getFWPaths,
        updateFWPath,
        addFWPath,
        deleteFWPath
    }
}
