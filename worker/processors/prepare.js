const ffprobe = require("ffprobe-static");
const ffmpeg = require("ffmpeg-static");
const FfmpegCommand = require("fluent-ffmpeg");
const path = require("path");
const settings = require("../settings");
const io = require("../socket.io-server");

// Setting paths for FF libraries
FfmpegCommand.setFfmpegPath(ffmpeg.path);
FfmpegCommand.setFfprobePath(ffprobe.path);

module.exports = function prepare({
  preset,
  destinationPath,
  fullFileInfo,
  totalPhysicalCores
}) {
  const {
    id,
    fileName,
    duration,
    options,
    extension: inputExtension,
    sourcePath,
  } = fullFileInfo;

  const interval = Math.floor(duration / totalPhysicalCores);
  const keyFrameInterval = interval < 1 ? 1 : interval;

  const originalFile = path.join(sourcePath, `${fileName}${inputExtension}`);

  const {
    inputOptions,
    outputOptions,
    outputExtension
  } = preset.preparationStage({
    options,
    duration,
    inputExtension
  });

  const fileToSave = path.join(
    destinationPath,
    `${fileName}${outputExtension}`
  );

  return new Promise((resolve, reject) => {
    const command = new FfmpegCommand(originalFile)
      .on("end", () => {
        // удаляем объект command который нужен для остановки кодирования
        settings.condition.deleteFileCommand(id, command);
        // возвращаем доп данные о файле
        resolve({
          keyFrameInterval: keyFrameInterval,
          extension: outputExtension,
          options
        });
      })
      .on("progress", progress => {
        io.emit("workerResponse", {
          fileProgress: {
            id,
            progress: Math.ceil(progress.percent)
          }
        });
      })
      .on("error", (err, stdout, stderr) => {
        settings.condition.deleteFileCommand(id, command);
        reject(stderr);
      })
      .inputOptions(inputOptions)
      .outputOptions([
        ...outputOptions,
        "-force_key_frames",
        `expr:gte(t, n_forced * ${keyFrameInterval})`
      ])
      .save(fileToSave);
    // добавляем в объект command для последующей возможности остановить процесс кодирования
    settings.condition.addFileCommand(id, command);
  });
};
