const multer = require("multer");
const settings = require("./models/settings");
const fsPromise = require('fs').promises;
const path = require('path');
// конфигурируем multer
// он перехватывает видео файлы и кладет их в папку
module.exports = (function () {
    let uploadPath = settings.get('uploadPath');

    settings.on('updateSettings', () => { 
        uploadPath = settings.get('uploadPath');
    });

    function init(req, res, next) {
        const fullFileName = decodeURIComponent(
            Buffer.from(req.headers['file-name'], 'base64').toString()
        );

        req.on('aborted', () => {
            const filePath = path.join(uploadPath, fullFileName);
            fsPromise.unlink(filePath)
            .then(() => {
                console.log('Отмененный файл удален');
            })
            .catch(e => {
                console.log('Не удалось удалить отмененный файл');
            })
        });

        const fileStorage = multer.diskStorage({
            filename: (req, file, cb) => {
                cb(null, fullFileName);
            },
            destination: (req, file, cb) => {
                cb(null, uploadPath);
            }
        });
        return multer({ storage: fileStorage }).single("file").call(null, req, res, next);
    }
    return {
        init
    }
})();


