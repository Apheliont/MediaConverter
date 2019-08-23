const { copyFile, deleteFile, deleteFolder } = require("../processors/clean");
const settings = require("../settings");
const fsPromise = require("fs").promises;
const path = require("path");
module.exports = async function clean(data) {
  try {
    // разбираем объект data
    // если есть объект copyFile, значит надо сделать копию перед удалением
    if ("sourceFile" in data) {
      const sourcePath =
        data.sourceFile.sourcePath === ""
          ? settings.sourcePath
          : data.sourceFile.sourcePath;
      const sourceFile = path.join(
        sourcePath,
        `${data.sourceFile.fileName}${data.sourceFile.extension}`
      );
      if (data.stashOriginalFile) {
        console.log("Satshing!");
        if (settings.stashPath === "") return;
        // парсим строку
        let stashPath = settings.stashPath;
        const lastIndexOfPlaceholder = stashPath.toLowerCase().lastIndexOf("%sourcepath%");
        if (lastIndexOfPlaceholder !== -1) {
          stashPath = path.join(
            sourcePath,
            stashPath.slice(lastIndexOfPlaceholder + "%sourcepath%".length)
          );
        }

        try {
          await fsPromise.mkdir(stashPath);
        } catch (e) {
          console.log(e);
        }

        const destFile = path.join(
          stashPath,
          `${data.sourceFile.fileName}${data.sourceFile.extension}`
        );
        await copyFile(sourceFile, destFile);
      }
      deleteFile(sourceFile).catch(e => {
        // неважно
      });
    }
    if ("outputFile" in data) {
      const outputPath = settings.categories.find(
        cat => cat.id === Number(data.outputFile.category)
      ).path;
      const extension = settings.getPreset(data.outputFile.category).O_FORMAT;

      const outputFile = path.join(
        outputPath,
        `${data.outputFile.fileName}${extension}`
      );
      deleteFile(outputFile).catch(e => {
        // неважно
      });
    }

    if ("tempRootPath" in data) {
      deleteFolder(data.tempRootPath).catch(e => {
        // неважно
      });
    }
  } catch (e) {
    console.log("Ошибка: ", e);
  }
};
