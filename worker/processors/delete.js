const fsPromise = require("fs").promises;
const util = require("util");
const path = require("path");
const settings = require("../settings");
// удаляет директорию рекурсивно
const rimraf = util.promisify(require("rimraf"));

// удаляет исходный файл с ФС
// sourceFileData - это объект у которого 3 поля
// sourcePath, fileName, extension
//
function deleteSourceFile(sourceFileData) {
  // Если исходный путь не указан, то считаем что файл зализ через web
  // интерфейс и ставим путь как в настройках
  if (sourceFileData.sourcePath === "") {
    sourceFileData.sourcePath = settings.sourcePath;
  }
  const sourceFile = path.join(
    sourceFileData.sourcePath,
    `${sourceFileData.fileName}${sourceFileData.extension}`
  );
  fsPromise.unlink(sourceFile).catch(e => {
    // неважно
  });
}

// удаляет выходной файл с ФС, если он был создан
// (значит стадия склейки была инициирована)
// outputFileData - это объект у которого 3 поля
// category, fileName, extension
//
function deleteOutputFile(outputFileData) {
  const outputPath = settings.categories.find(
    cat => cat.id === Number(outputFileData.category)
  ).path;
  const outputFile = path.join(
    outputPath,
    `${outputFileData.fileName}${outputFileData.extension}`
  );
  fsPromise.unlink(outputFile).catch(e => {
    // неважно
  });
}
// удаляет Temp папку файла и все находящиеся там файлы
function deleteTempFolder(tempFolderPath) {
  rimraf(tempFolderPath).catch(e => {
    // неважно
  });
}

module.exports = {
  deleteSourceFile,
  deleteTempFolder,
  deleteOutputFile
};
