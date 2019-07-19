const ffprobe = require("ffprobe-static");
const ffmpeg = require("ffmpeg-static");
const FfmpegCommand = require("fluent-ffmpeg");
const settings = require("../settings");
const io = require("../socket.io-server");

// Setting paths for FF libraries
FfmpegCommand.setFfmpegPath(ffmpeg.path);
FfmpegCommand.setFfprobePath(ffprobe.path);

module.exports = async function transcode({
  id,
  part,
  sourceFile,
  destFile,
  startTime,
  duration,
  options,
  isLast,
  preset
}) {
  const {
    inputOptions,
    outputOptions,
    totalFramesInPart
  } = preset.transcodeStage({ options, duration });
  // для ускорения конвертации используем хак ffmpeg - быстрый, но неточный поиск в
  // inputOptions он ищет по key frames. Остаток пути проходится медленным поиском
  // он перебирает каждый кадр за кадром. Таким образом получаем и быстро и точно

  let fastSeekStartTime;
  let slowSeekStartTime;
  const FSLOW_DELTA = 1; // 1 секунда на медленный поиск для точного попадания в keyFrame
  if (startTime >= 2) {
    fastSeekStartTime = startTime - FSLOW_DELTA;
    slowSeekStartTime = FSLOW_DELTA;
    inputOptions.push(`-ss ${fastSeekStartTime}`);
  } else {
    slowSeekStartTime = startTime;
  }

  outputOptions.push(`-ss ${slowSeekStartTime}`);
  if (!isLast) {
    outputOptions.push(`-t ${duration}`);
  }

  return new Promise((resolve, reject) => {
    const command = new FfmpegCommand(sourceFile)
      .inputOptions(inputOptions)
      .on("end", () => {
        settings.condition.deleteFileCommand(id, command);
        resolve();
      })
      .on("error", (err, stdout, stderr) => {
        // удаляем объект command котрый используется для остановки кодирования
        settings.condition.deleteFileCommand(id, command);
        reject(err);
      })
      .on("progress", progress => {
        io.emit("workerResponse", {
          fileProgress: {
            id,
            progress: Math.round((100 * progress.frames) / totalFramesInPart),
            part
          }
        });
      })
      .outputOptions(outputOptions)
      .save(destFile);
    // добавляем объект command для возможности прервать кодирование
    settings.condition.addFileCommand(id, command);
  });
};
