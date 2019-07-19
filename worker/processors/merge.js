const ffprobe = require("ffprobe-static");
const ffmpeg = require("ffmpeg-static");
const FfmpegCommand = require("fluent-ffmpeg");
const path = require("path");
const settings = require("../settings");
const io = require("../socket.io-server");

// Setting paths for FF libraries
FfmpegCommand.setFfmpegPath(ffmpeg.path);
FfmpegCommand.setFfprobePath(ffprobe.path);

module.exports = function merge({ preset, file }) {
  const { id, sourcePath, finalInTemp, duration, filesToMerge } = file;
  const { outputOptions, totalFrames } = preset.mergeStage(duration);

  process.chdir(sourcePath);
  return new Promise((resolve, reject) => {
    const command = new FfmpegCommand()
      .input(filesToMerge)
      .on("end", () => {
        process.chdir(path.join(sourcePath, "..", ".."));
        // удаляем объект command котрый используется для остановки кодирования
        settings.condition.deleteFileCommand(id, command);
        resolve();
      })
      .on("progress", progress => {
        const fp = Math.round((100 * progress.frames) / totalFrames);
        io.emit("workerResponse", {
          fileProgress: {
            id,
            progress: fp > 100 ? 100 : fp
          }
        });
      })
      .on("error", (err, stdout, stderr) => {
        process.chdir(path.join(sourcePath, "..", ".."));
        settings.condition.deleteFileCommand(id, command);
        reject(err);
      })
      .outputOptions(outputOptions)
      .save(finalInTemp);
    // добавляем объект command для возможности прервать кодирование
    settings.condition.addFileCommand(id, command);
  });
};
