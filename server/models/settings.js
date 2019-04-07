const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');
const fileSettingsPath = path.join(__dirname, "..", 'settings.json');


module.exports = (function () {

    let _settings = null;

    function readSettings() {
        try {
            const data = fs.readFileSync(fileSettingsPath, { encoding: 'utf8' });
            const settingsParsed = JSON.parse(data);
            _settings = settingsParsed;
        } catch (e) {
            console.log('Ошибка в функции чтения настроек', e.message);
        }

    }

    return new class extends EventEmitter {
        constructor() {
            super();
            readSettings();
        }

        get(key) {
            if (key === 'undefined') {
                return Object.assign({}, _settings);
            }

            if (key in _settings) {
                if (typeof _settings[key] === 'object') {
                    return Object.assign({}, _settings[key]);
                }
                return _settings[key];
            }
            return Object.assign({}, _settings);
        }

        set(data) {
            try {
                const settingsString = JSON.stringify(data);
                fs.writeFileSync(fileSettingsPath, settingsString, { encoding: 'utf8' });
                readSettings();
                this.emit('updateSettings');
            } catch (e) {
                console.log('Ошибка в функции записи настроек', e.message);
            }
        }
    }
})();
