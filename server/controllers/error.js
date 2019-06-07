const db = require('../database/main');

function getError(req, res) {
    const id = Number(req.params.id);
    db.getError(id)
    .then(error => {
        res.status(200).json(error);
    })
    .catch(e => {
        res.status(500).send(e);
    })
}

module.exports = {
    getError
};