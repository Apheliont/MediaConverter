const ffprobe = require("ffprobe-static");
const ffmpeg = require("ffmpeg-static");
const FfmpegCommand = require("fluent-ffmpeg");
const path = require("path");
const fsPromise = require("fs").promises;
const settings = require("../settings");
const io = require("../socket.io-server");

// Setting paths for FF libraries
FfmpegCommand.setFfmpegPath(ffmpeg.path);
FfmpegCommand.setFfprobePath(ffprobe.path);

module.exports = class Merge {
  constructor({ id, fileName, destinationPath, sourcePath, duration }) {
    this.id = id;
    this.destinationPath = destinationPath;
    this.fileName = fileName;
    this.sourcePath = sourcePath;
    this.duration = duration;
  }

  async merge() {
    const totalFrames = this.duration * 25;
    const files = await fsPromise.readdir(this.sourcePath);
    const filesFormated = `concat:${files.join("|")}`;
    process.chdir(this.sourcePath);
    return new Promise((resolve, reject) => {
      const command = new FfmpegCommand()
        .input(filesFormated)
        .on("end", () => {
          process.chdir(path.join(this.sourcePath, "..", ".."));
          // удаляем объект command котрый используется для остановки кодирования
          settings.condition.deleteFileCommand(this.id, command);
          resolve();
        })
        .on("progress", progress => {
          const fp = Math.round(100 * progress.frames / totalFrames);
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
        .save(path.join(this.destinationPath, `${this.fileName}.mxf`));
      // добавляем объект command для возможности прервать кодирование
      settings.condition.addFileCommand(this.id, command);
    });
  }
};
