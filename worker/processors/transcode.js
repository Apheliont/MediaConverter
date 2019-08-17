const ffprobe = require("ffprobe-static");
const ffmpeg = require("ffmpeg-static");
const FfmpegCommand = require("fluent-ffmpeg");
const settings = require("../settings");

// Setting paths for FF libraries
FfmpegCommand.setFfmpegPath(ffmpeg.path);
FfmpegCommand.setFfprobePath(ffprobe.path);

module.exports = function transcode({
  id,
  part,
  inputFile,
  outputFile,
  startTime,
  duration,
  options,
  isLast,
  preset
}) {
  // для ускорения конвертации используем хак ffmpeg - быстрый, но неточный поиск в
  // inputOptions он ищет по key frames. Остаток пути проходится медленным поиском
  // он перебирает каждый кадр. Таким образом получаем и быстро и точно
  const outputOptions = [];
  const inputOptions = [];

  let fastSeekStartTime;
  let slowSeekStartTime;
  const FSLOW_DELTA = 2; // X секунд на медленный поиск для точного попадания в keyFrame
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

  const { ffmpegCommands, totalFramesInPart } = preset.transcodeStage({
    options,
    duration
  });

  return new Promise((resolve, reject) => {
    const command = new FfmpegCommand(inputFile)
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
        const fp = Math.round((100 * progress.frames) / totalFramesInPart);
        settings.condition.setProgress(command, {
          progress: fp > 100 ? 100 : fp,
          part
        });
      })
      .preset(ffmpegCommands)
      .outputOptions(outputOptions)
      .save(outputFile);
    // добавляем объект command для возможности прервать кодирование
    settings.condition.addFileCommand(id, command);
  });
};
