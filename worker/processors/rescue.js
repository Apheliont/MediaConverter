const ffprobe = require("ffprobe-static");
const ffmpeg = require("ffmpeg-static");
const FfmpegCommand = require("fluent-ffmpeg");
const path = require("path");
const settings = require("../settings");

// Setting paths for FF libraries
FfmpegCommand.setFfmpegPath(ffmpeg.path);
FfmpegCommand.setFfprobePath(ffprobe.path);

module.exports = function prepare({
  id,
  fileName,
  extension: inputExtension,
  sourcePath,
  preset,
  rescuePath
}) {
  const inputFile = path.join(sourcePath, `${fileName}${inputExtension}`);

  const { ffmpegCommands, outputExtension } = preset.rescueStage({
    inputExtension
  });

  // можно переопределить
  const rescuedFileName = fileName;

  const outputFile = path.join(
    rescuePath,
    `${rescuedFileName}${outputExtension}`
  );

  return new Promise((resolve, reject) => {
    const command = new FfmpegCommand(inputFile)
      .on("end", () => {
        // удаляем объект command который нужен для остановки кодирования
        settings.condition.deleteFileCommand(id, command);
        // возвращаем доп данные о файле
        resolve({
          rescuedFileName: fileName,
          rescuedExtension: outputExtension
        });
      })
      .on("error", (err, stdout, stderr) => {
        settings.condition.deleteFileCommand(id, command);
        reject(stderr);
      })
      .preset(ffmpegCommands)
      .save(outputFile);
    // добавляем в объект command для последующей возможности остановить процесс кодирования
    settings.condition.addFileCommand(id, command);
  });
};
