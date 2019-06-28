const ffprobe = require("ffprobe-static");
const ffmpeg = require("ffmpeg-static");
const FfmpegCommand = require("fluent-ffmpeg");
const path = require("path");
const settings = require("../settings");
const io = require("../socket.io-server");

const converterOptions = {
  presets: path.join(__dirname, "..", "presets")
};

// Setting paths for FF libraries
FfmpegCommand.setFfmpegPath(ffmpeg.path);
FfmpegCommand.setFfprobePath(ffprobe.path);

module.exports = class Transcode {
  constructor({
    id,
    part,
    sourceFile,
    destFile,
    startTime,
    duration,
    options,
    isLast
  }) {
    this.id = id;
    this.part = part;
    this.sourceFile = sourceFile;
    this.destFile = destFile;
    this.startTime = startTime;
    this.duration = duration;
    this.options = options;
    this.isLast = isLast;
  }

  async start() {
    const presetName = this.options.isMute
      ? "mxf_mute"
      : this.options.splitAudio
      ? "mxf_split_audio"
      : "mxf_no_split";

    const outputOptions = [];

    // пытаемся исправить aspect ratio
    if (this.options.aspectRatio.definedAspect === "16:9") {
      outputOptions.push("-s 1920:1080");
    } else if (this.options.aspectRatio.SAR < 1.777) {
      outputOptions.push(
        `-vf scale=${Math.round(
          1080 * this.options.aspectRatio.SAR
        )}:1080,pad=1920:1080:${Math.round(
          (1920 - this.options.aspectRatio.width) / 2
        )}:${Math.round(
          (1080 - this.options.aspectRatio.height) / 2
        )},setdar=1.7777`
      );
    } else {
      outputOptions.push(
        `-vf scale=1920:${Math.round(
          1920 / this.options.aspectRatio.SAR
        )},pad=1920:1080:${Math.round(
          (1920 - this.options.aspectRatio.width) / 2
        )}:${Math.round(
          (1080 - this.options.aspectRatio.height) / 2
        )},setdar=1.7777`
      );
    }

    // для ускорения конвертации используем хак ffmpeg - быстрый, но неточный поиск в
    // inputOptions он ищет по key frames. Остаток пути проходится медленным поиском
    // он перебирает каждый кадр за кадром. Таким образом получаем и быстро и точно

    const inputOptions = [];
    let fastSeekStartTime;
    let slowSeekStartTime;
    const FSLOW_DELTA = 1; // 1 секунда на медленный поиск для точного попадания в keyFrame
    if (this.startTime >= 2) {
      fastSeekStartTime = this.startTime - FSLOW_DELTA;
      slowSeekStartTime = FSLOW_DELTA;
      inputOptions.push(`-ss ${fastSeekStartTime}`);
    } else {
      slowSeekStartTime = this.startTime;
    }

    outputOptions.push(`-ss ${slowSeekStartTime}`);
    if (!this.isLast) {
      outputOptions.push(`-t ${this.duration}`);
    }

    const totalFramesInPart = this.duration * 25;

    return new Promise((resolve, reject) => {
      const command = new FfmpegCommand(this.sourceFile, converterOptions)
        .inputOptions(inputOptions)
        .on("end", () => {
          settings.condition.deleteFileCommand(this.id, command);
          resolve();
        })
        .on("error", (err, stdout, stderr) => {
          // удаляем объект command котрый используется для остановки кодирования
          settings.condition.deleteFileCommand(this.id, command);
          reject(err);
        })
        .on("progress", progress => {
          io.emit("workerResponse", {
            fileProgress: {
              id: this.id,
              progress: Math.round(100 * progress.frames / totalFramesInPart),
              part: this.part
            }
          });
        })
        .preset(presetName)
        .outputOptions(outputOptions)
        .save(this.destFile);
      // добавляем объект command для возможности прервать кодирование
      settings.condition.addFileCommand(this.id, command);
    });
  }
};
