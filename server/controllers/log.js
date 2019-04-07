const db = require('../database/main');

function getLogs(req, res) {
    db.getLogs()
    .then(logs => {
        res.status(200).json(logs);
    })
    .catch(e => {
        res.status(500).send(e);
    })
}

module.exports = {
    getLogs
};