const ffprobe = require("ffprobe-static");
const ffmpeg = require("ffmpeg-static");
const FfmpegCommand = require("fluent-ffmpeg");
const path = require("path");
const settings = require("../settings");

// Setting paths for FF libraries
FfmpegCommand.setFfmpegPath(ffmpeg.path);
FfmpegCommand.setFfprobePath(ffprobe.path);

module.exports = function prepare({
  preset,
  destinationPath,
  inputFileInfo,
}) {
  const {
    id,
    fileName,
    duration,
    options,
    extension: inputExtension,
    sourcePath,
  } = inputFileInfo;

  const interval = Math.floor(duration / settings.totalPhysicalCores);
  const keyFrameInterval = interval < 1 ? 1 : interval;

  const {
    ffmpegCommands,
    outputExtension
  } = preset.preparationStage({
    options,
    duration,
    inputExtension
  });
  
  const inputFile = path.join(sourcePath, `${fileName}${inputExtension}`);
  const outputFile = path.join(
    destinationPath,
    `${fileName}${outputExtension}`
  );

  const totalFrames = options.originalFrameRate * duration;

  return new Promise((resolve, reject) => {
    const command = new FfmpegCommand(inputFile)
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
        const fp = Math.round((100 * progress.frames) / totalFrames);
        settings.condition.setProgress(command, {
          progress: fp > 100 ? 100 : fp,
          part: -1
        })
      })
      .on("error", (err, stdout, stderr) => {
        settings.condition.deleteFileCommand(id, command);
        reject(stderr);
      })
      .preset(ffmpegCommands)
      .outputOptions([
        "-force_key_frames",
        `expr:gte(t, n_forced * ${keyFrameInterval})`
      ])
      .save(outputFile);
    // добавляем в объект command для последующей возможности остановить процесс кодирования
    settings.condition.addFileCommand(id, command);
  });
};
