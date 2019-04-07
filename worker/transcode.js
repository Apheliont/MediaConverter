const path = require("path");
const fsPromise = require("fs").promises;

const ParallelConverter = require("./parallelConversion");

let parallelConversion = null;

function stopConversion() {
  if (parallelConversion) {
    parallelConversion.stopProcess();
  }
}

async function deleteFiles(dir) {
  try {
    const files = await fsPromise.readdir(dir);
    if (files.length === 0) {
      return Promise.resolve();
    }
    const deletePromises = [];
    files.forEach(file => {
      deletePromises.push(fsPromise.unlink(path.join(dir, file)));
    });
    return Promise.all(deletePromises);
  } catch (e) {
    console.log("Ошибка в deleteFiles", e.message);
    throw e;
  }
}

async function clearTempFiles({ nestedTempDir, originalFile }) {
  try {
    await deleteFiles(nestedTempDir);
    return Promise.all([
      fsPromise.rmdir(nestedTempDir),
      fsPromise.unlink(originalFile)
    ]);
  } catch (e) {
    console.log("Ошибка в clearTempFiles", e.message);
    throw e;
  }
}

async function transcode({ fullFileInfo, tempFolder, io }) {
  const { id, fileName, extension, sourcePath, destinationPath } = fullFileInfo;

  const file = path.join(sourcePath, `${fileName}${extension}`);

  try {
    await fsPromise.stat(tempFolder);
  } catch (e) {
    fsPromise.mkdir(tempFolder);
  }

  try {
    var nestedTempDir = await fsPromise.mkdtemp(
      path.join(tempFolder, `${id}-`)
    );

    parallelConversion = new ParallelConverter(
      Object.assign(
        {
          tempDir: nestedTempDir
        },
        fullFileInfo
      )
    );
    parallelConversion.on("filePercent", progress => {
      io.emit("fileProgress", {
        id,
        progress
      });
    });
    return await parallelConversion.startProcess();
  } catch (e) {
    // на этапе mergeFiles, файл уже кладется в папку destination
    // надо грохнуть этот файл если он там есть, т.к он битый
    console.log("Ошибка в transcode", e.message);

    const destBrokenFile = path.join(destinationPath, `${fileName}.mxf`);

    // УДАЛИТЬ!!! ЭТО ВРЕМЕННО ДЛЯ ТЕСТА!
    // Копирует неоткодированный файл для анализа и на бэкап-кодировщик
    // -----------------------------------
    try {
      await Promise.all([
        fsPromise.copyFile(
          file,
          `\\\\media\\v\\_vbram_bad_files\\${fileName}${extension}`
        ),
        fsPromise.copyFile(
          file,
          `\\\\media\\v\\Transcode_Internet_old\\${fileName}${extension}`
        )
      ])
    } catch (e) {
      console.log("Ошибка копирования неоткодированного файла!", e.message);
    }
    // -----------------------------------

    try {
      await fsPromise.unlink(destBrokenFile);
    } catch (err) {
      // эта ошибка не важна
    }
    throw e;
  } finally {
    if (nestedTempDir) {
      try {
        await new Promise((resolve, reject) => {
          setTimeout(() => {
            clearTempFiles({
              nestedTempDir,
              originalFile: file
            })
              .then(() => resolve())
              .catch(e => reject(e));
          }, 5000);
        });
      } catch (e) {
        console.log("Ошибка в finally: ", e.message);
      }
    }
  }
}

module.exports = {
  transcode,
  stopConversion
};
