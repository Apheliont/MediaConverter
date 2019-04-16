const ffprobe = require("ffprobe-static");
const ffmpeg = require("ffmpeg-static");
const FfmpegCommand = require("fluent-ffmpeg");
const path = require("path");
const EventEmitter = require("events");

const converterOptions = {
  presets: path.join(__dirname, "presets")
};

// Setting paths for FF libraries
FfmpegCommand.setFfmpegPath(ffmpeg.path);
FfmpegCommand.setFfprobePath(ffprobe.path);

module.exports = class Transcode extends EventEmitter {
  constructor({
    fileName,
    extension,
    sourcePath,
    destinationPath,
    keyFrameInterval,
    options,
    parts // это объект у которого ключи - номер части, значение bool - если true то часть последняя
  }) {
    super();
    this.fileName = fileName;
    this.extension = extension;
    this.sourcePath = sourcePath;
    this.destinationPath = destinationPath;
    this.keyFrameInterval = keyFrameInterval;
    this.parts = parts;
    this.options = options;
    // this.command = new Set();
  }

  //   get totalFrames() {
  //     return this.duration * 25;
  //   }

  async transcode() {
    // const fileNames = [];
    // let currentTime = 0;
    const allPromises = [];
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
    //`-ss ${lastStart}`, `-t ${duration}`

    // номера частей должны начинаться с 0!!
    const helper = (partNum, isLast) => {
      const partFileName = `${this.fileName}_part_${partNum + 1}.mxf`;

      const newPart = new Promise((resolve, reject) => {
        const command = new FfmpegCommand(
          path.join(this.sourcePath, `${this.fileName}${this.extension}`),
          converterOptions
        )
          .inputOptions(firstStart)
          .on("end", () => {
            //this.command.delete(command);
            resolve();
          })
          .on("error", (err, stdout, stderr) => {
            reject(err);
          })
          .on("progress", progress => {
            //arrayOfParts[index] = progress.frames;
            //this.emit("filePercent", totalPercent(arrayOfParts));
          })
          .preset(presetName)
          .outputOptions(outputOptions)
          .save(path.join(this.destinationPath, partFileName));
        //this.command.add(command);
      });

      allPromises.push(newPart);
    };

    Object.keys(parts).forEach(part => {
      helper(part, parts[part]);
    });

    return Promise.all(allPromises);
    //вычисляем общий процент готовности файла
    // const arrayOfParts = [];

    // const totalPercent = arrayOfParts => {
    //   const processedFrames = arrayOfParts.reduce((sum, next) => {
    //     return sum + next;
    //   }, 0);
    //   return Math.round((processedFrames / this.totalFrames) * 80);
    // };

    // хак для ускоренного seek с последующим медленным но точным seek
    // const convertPart = (startTime, duration, index) => {
    //   let firstStart = [];
    //   let lastStart;
    //   if (startTime >= 2) {
    //     const vastMajority = Math.floor(startTime * 0.8);
    //     lastStart = startTime - vastMajority;
    //     firstStart.push(`-ss ${vastMajority}`);
    //   } else {
    //     lastStart = startTime;
    //   }

    // const resedue = this.duration % this.keyFrameInterval;

    // let index = 0;
    // const end = Math.floor(this.duration / this.keyFrameInterval);
    // if (resedue > 0 && resedue < 1) {
    //   for (; index < end - 1; currentTime += this.keyFrameInterval, index++) {
    //     convertPart(currentTime, this.keyFrameInterval, index);
    //   }
    //   convertPart(currentTime, this.keyFrameInterval + resedue, index);
    // } else {
    //   for (; index < end; currentTime += this.keyFrameInterval, index++) {
    //     convertPart(currentTime, this.keyFrameInterval, index);
    //   }
    //   if (resedue >= 1) {
    //     convertPart(currentTime, resedue, index);
    //   }
    // }

    // await Promise.all(allPromises);
    // return fileNames;
  }

  //   stopProcess() {
  //     if (this.command.size > 0) {
  //       this.command.forEach(command => command.kill());
  //     }
  //   }

  async start() {
    try {
      return await this.transcode();
    } catch (e) {
      // если ошибка связана с отменой файла то это ОК, не пробрасываем ее дальше
      if (e.message && e.message.split(" ").includes("SIGKILL")) {
        console.log("Файл был отменен пользователем!");
      } else {
        console.log("Ошибка в transcode", e.message);
        throw e;
      }
    }
  }
};
