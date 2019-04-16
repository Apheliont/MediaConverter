const ffprobe = require("ffprobe-static");
const ffmpeg = require("ffmpeg-static");
const FfmpegCommand = require("fluent-ffmpeg");
const path = require("path");
const EventEmitter = require("events");

// Setting paths for FF libraries
FfmpegCommand.setFfmpegPath(ffmpeg.path);
FfmpegCommand.setFfprobePath(ffprobe.path);

module.exports = class Prepare extends EventEmitter {
  constructor({ destinationPath, fullFileInfo, totalPhysicalCores }) {
    super();
    this.destinationPath = destinationPath;
    this.fileName = fullFileInfo.fileName;
    this.originalExtension = fullFileInfo.extension;
    this.sourcePath = fullFileInfo.sourcePath;
    this.duration = fullFileInfo.duration;
    this.options = fullFileInfo.options;
    this.totalPhysicalCores = totalPhysicalCores;
    //this.command = new Set();
    console.log("tempPath:", destinationPath);
  }

  get keyFrameInterval() {
    const interval = Math.floor(this.duration / this.totalPhysicalCores);
    return interval < 1 ? 1 : interval;
  }

  get extension() {
    return this.options.badContainer ? ".mkv" : this.originalExtension;
  }

  get originalFile() {
    return path.join(
      this.sourcePath,
      `${this.fileName}${this.originalExtension}`
    );
  }

  setKeyFrames() {
    const outputOptions = [];
    const inputOptions = [];

    if (this.options.changeStreams) {
      outputOptions.push(...["-map v:0", "-map a:1?", "-map a:0"]);
    } else {
      outputOptions.push("-map 0");
    }

    if (this.options.partialTranscode.isValid) {
      inputOptions.push(
        ...[
          `-ss ${this.options.partialTranscode.startTime}`,
          `-t ${this.duration}`
        ]
      );
    }

    if (this.options.badContainer) {
      inputOptions.push("-fflags +genpts");
      outputOptions.push(
        ...["-acodec pcm_s24le", "-ar 48000", "-ab 1152k", "-c:v copy"]
      );
    } else {
      outputOptions.push("-c copy");
    }

    // вырезаем таймкод поток
    if (this.options.timeCodeStream) {
      outputOptions.push(`-write_tmcd 0`);
    }

    // вырезаем все неизвестные стримы т.к они приведут к ошибке кодирования
    if (this.options.badStreams.length > 0) {
      this.options.badStreams.forEach(index => {
        outputOptions.push(`-map -0:${index}?`);
      });
    }

    const fileToSave = path.join(
      this.destinationPath,
      `${this.fileName}${this.extension}`
    );
    console.log("file to save path: ", fileToSave);

    return new Promise((resolve, reject) => {
      const command = new FfmpegCommand(this.originalFile)
        .on("end", () => {
          //this.command.delete(command);
          // возвращаем доп данные о файле
          resolve(
            Object.assign(
              {},
              {
                keyFrameInterval: this.keyFrameInterval,
                totalParts: Math.floor(this.duration / this.keyFrameInterval),
                extension: this.extension,
                sourcePath: this.destinationPath
              }
            )
          );
        })
        .on("error", (err, stdout, stderr) => {
          reject(err);
        })
        .inputOptions(inputOptions)
        .outputOptions([
          ...outputOptions,
          "-force_key_frames",
          `expr:gte(t, n_forced * ${this.keyFrameInterval})`,
          "-sn"
        ])
        .save(fileToSave);
      //this.command.add(command);
    });
  }

  //   stopProcess() {
  //     if (this.command.size > 0) {
  //       this.command.forEach(command => command.kill());
  //     }
  //   }

  async start() {
    try {
      return await this.setKeyFrames();
    } catch (e) {
      // если ошибка связана с отменой файла то это ОК, не пробрасываем ее дальше
      if (e.message && e.message.split(" ").includes("SIGKILL")) {
        console.log("Файл был отменен пользователем!");
      } else {
        console.log("Ошибка в prepare", e.message);
        throw e;
      }
    }
  }
};
