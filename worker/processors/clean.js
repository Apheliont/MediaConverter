const fsPromise = require("fs").promises;
const util = require("util");
// удаляет директорию рекурсивно
const rimraf = util.promisify(require("rimraf"));

module.exports = {
  async copyFile(srcPath, dstPath) {
    try {
      await fsPromise.copyFile(srcPath, dstPath);
    } catch (e) {
      console.log("Ошибка: ", e);
    }
  },

  async deleteFile(path) {
    try {
      await fsPromise.unlink(path);
    } catch (e) {
      console.log("Ошибка: ", e);
    }
  },

  async deleteFolder(path) {
    try {
      await rimraf(path);
    } catch (e) {
      console.log("Ошибка: ", e);
    }
  }
};
