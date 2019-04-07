const settings = require('../models/settings');

function getSettings(req, res) {
    try {
        res.send(settings.get());
    } catch (e) {
        res.status(500).send(e.message);
    }
}

function setSettings(req, res) {
    try {
        settings.set(req.body);
        res.status(200).end();
    } catch (e) {
        res.status(500).send(e.message);
    }
}

module.exports = {
    getSettings,
    setSettings
};