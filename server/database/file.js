const addFileQuery = `INSERT INTO files SET ?`;
const updateFileQuery = `UPDATE files SET ? WHERE id = ?`;
const getFilesQuery = `SELECT * FROM files AS files`;
const deleteFileQuery = `DELETE FROM files WHERE id = ?`;

module.exports = function (pool) {
    function addFile({ fileName, extension, size, category, created_at }) {
        return new Promise((resolve, reject) => {
            pool.query(
                addFileQuery,
                { fileName, extension, size, category, created_at },
                (err, result, fields) => {
                    if (err) {
                        reject(err);
                    }
                    resolve(result.insertId);
                }
            );
        });
    }

    function updateFile(data) {
        const id = data.id;
        const propsToUpdate = {};
        Object.keys(data).forEach(prop => {
            if (data[prop] !== 'undefined' && prop !== 'id') {
                propsToUpdate[prop] = data[prop];
            }
        });
        return new Promise((resolve, reject) => {
            pool.query(
                updateFileQuery,
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

    function getFiles() {
        return new Promise((resolve, reject) => {
            pool.query(getFilesQuery, (err, result, fields) => {
                if (err) {
                    reject(err);
                }
                resolve(result);
            });
        });
    }

    function deleteFile(id) {
        return new Promise((resolve, reject) => {
            pool.query(deleteFileQuery, id, (err, result, fields) => {
                if (err) {
                    reject(err);
                }
                resolve();
            });
        })
    }

    return {
        getFiles,
        updateFile,
        addFile,
        deleteFile
    }
}