const ffprobe = require("ffprobe-static");
const ffmpeg = require("ffmpeg-static");
const FfmpegCommand = require("fluent-ffmpeg");
const path = require("path");
const settings = require("../settings");
const io = require("../socket.io-server");

// Setting paths for FF libraries
FfmpegCommand.setFfmpegPath(ffmpeg.path);
FfmpegCommand.setFfprobePath(ffprobe.path);

module.exports = class Merge {
  constructor({
    id,
    fileName,
    sourcePath,
    finalInTemp,
    duration,
    filesToMerge
  }) {
    this.id = id;
    this.fileName = fileName;
    this.sourcePath = sourcePath;
    this.finalInTemp = finalInTemp;
    this.duration = duration;
    this.filesToMerge = filesToMerge;
  }

  start() {
    const totalFrames = this.duration * 25;

    process.chdir(this.sourcePath);
    return new Promise((resolve, reject) => {
      const command = new FfmpegCommand()
        .input(this.filesToMerge)
        .on("end", () => {
          process.chdir(path.join(this.sourcePath, "..", ".."));
          // удаляем объект command котрый используется для остановки кодирования
          settings.condition.deleteFileCommand(this.id, command);
          resolve();
        })
        .on("progress", progress => {
          const fp = Math.round((100 * progress.frames) / totalFrames);
          io.emit("workerResponse", {
            fileProgress: {
              id: this.id,
              progress: fp > 100 ? 100 : fp
            }
          });
        })
        .on("error", (err, stdout, stderr) => {
          process.chdir(path.join(this.sourcePath, "..", ".."));
          settings.condition.deleteFileCommand(this.id, command);
          reject(err);
        })
        .outputOptions(["-map 0", "-c copy"])
        .save(this.finalInTemp);
      // добавляем объект command для возможности прервать кодирование
      settings.condition.addFileCommand(this.id, command);
    });
  }
};
