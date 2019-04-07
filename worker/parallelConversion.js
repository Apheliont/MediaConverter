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

const numCPUs = require("os").cpus().length / 2;

module.exports = class ParallelConverter extends EventEmitter {
  constructor({
    tempDir,
    fileName,
    extension,
    duration,
    sourcePath,
    destinationPath,
    options
  }) {
    super();
    this.tempDir = tempDir;
    this.fileName = fileName;
    this.originalExtension = extension;
    this.sourcePath = sourcePath;
    this.duration = duration;
    this.options = options;
    this.destinationPath = destinationPath;
    this.command = new Set();
  }

  get keyFrameInterval() {
    const interval = Math.floor(this.duration / numCPUs);
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
  get totalFrames() {
    return this.duration * 25;
  }

  setKeyFrames() {
    const outputOptions = [];
    const inputOptions = [];

    if (this.options.changeStreams) {
      outputOptions.push(...["-map v:0", "-map a:1?", "-map a:0"]);
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
        ...[
          "-acodec pcm_s24le",
          "-ar 48000",
          "-ab 1152k",
          "-c:v copy"
        ]
      );
    }

    if (outputOptions.length === 0) {
      outputOptions.push("-map 0");
    }

    if (!this.options.badContainer) {
      outputOptions.push("-c copy");
    }

    // вырезаем все неизвестные стримы т.к они приведут к ошибке кодирования
    if (this.options.badStreams.length > 0) {
      this.options.badStreams.forEach(index => {
        outputOptions.push(`-map -0:${index}`);
      });
    }

    const fileToSave = path.join(
      this.tempDir,
      `${this.fileName}${this.extension}`
    );
    return new Promise((resolve, reject) => {
      const command = new FfmpegCommand(this.originalFile)
        .on("end", () => {
          this.command.delete(command);
          resolve();
        })
        .on("error", (err, stdout, stderr) => {
          console.log("Ошибка в setKeyFrames:", stderr);
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
      this.command.add(command);
    });
  }

  async splitFile() {
    const fileNames = [];
    let currentTime = 0;
    const allPromises = [];
    const presetName = this.options.isMute
      ? "mxf_mute"
      : this.options.splitAudio
      ? "mxf_split_audio"
      : "mxf_no_split";

    //вычисляем общий процент готовности файла
    const arrayOfParts = [];

    const totalPercent = arrayOfParts => {
      const processedFrames = arrayOfParts.reduce((sum, next) => {
        return sum + next;
      }, 0);
      return Math.round((processedFrames / this.totalFrames) * 80);
    };

    // хак для ускоренного seek с последующим медленным но точным seek
    const convertPart = (startTime, duration, index) => {
      let firstStart = [];
      let lastStart;
      if (startTime >= 2) {
        const vastMajority = Math.floor(startTime * 0.8);
        lastStart = startTime - vastMajority;
        firstStart.push(`-ss ${vastMajority}`);
      } else {
        lastStart = startTime;
      }

      const outputOptions = [`-ss ${lastStart}`, `-t ${duration}`];
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

      const partFileName = `${this.fileName}_part_${index + 1}.mxf`;
      fileNames.push(partFileName);
      const newPart = new Promise((resolve, reject) => {
        const command = new FfmpegCommand(
          path.join(this.tempDir, `${this.fileName}${this.extension}`),
          converterOptions
        )
          .inputOptions(firstStart)
          .on("end", () => {
            this.command.delete(command);
            resolve();
          })
          .on("error", (err, stdout, stderr) => {
            reject(err);
          })
          .on("progress", progress => {
            arrayOfParts[index] = progress.frames;
            this.emit("filePercent", totalPercent(arrayOfParts));
          })
          .preset(presetName)
          .outputOptions(outputOptions)
          .save(path.join(this.tempDir, partFileName));
        this.command.add(command);
      });
      allPromises.push(newPart);
    };

    const resedue = this.duration % this.keyFrameInterval;

    let index = 0;
    const end = Math.floor(this.duration / this.keyFrameInterval);
    if (resedue > 0 && resedue < 1) {
      for (; index < end - 1; currentTime += this.keyFrameInterval, index++) {
        convertPart(currentTime, this.keyFrameInterval, index);
      }
      convertPart(currentTime, this.keyFrameInterval + resedue, index);
    } else {
      for (; index < end; currentTime += this.keyFrameInterval, index++) {
        convertPart(currentTime, this.keyFrameInterval, index);
      }
      if (resedue >= 1) {
        convertPart(currentTime, resedue, index);
      }
    }

    try {
      await Promise.all(allPromises);
      return fileNames;
    } catch (e) {
      throw e;
    }
  }

  mergeFiles(files) {
    const filesFormated = `concat:${files.join("|")}`;
    process.chdir(this.tempDir);
    return new Promise((resolve, reject) => {
      const command = new FfmpegCommand()
        .input(filesFormated)
        .on("end", () => {
          this.command.delete(command);
          resolve();
        })
        .on("progress", progress => {
          this.emit(
            "filePercent",
            Math.round((progress.frames / this.totalFrames) * 20) + 80
          );
        })
        .on("error", (err, stdout, stderr) => {
          console.log("Ошибка в mergeFiles", stderr);
          reject(err);
        })
        .outputOptions(["-map 0", "-c copy"])
        .save(path.join(this.destinationPath, `${this.fileName}.mxf`));
      this.command.add(command);
    });
  }

  stopProcess() {
    if (this.command.size > 0) {
      this.command.forEach(command => command.kill());
    }
  }

  async startProcess() {
    try {
      await this.setKeyFrames();
      const files = await this.splitFile();
      return await this.mergeFiles(files);
    } catch (e) {
      // если ошибка связана с отменой файла то это ОК, не пробрасываем ее дальше
      if (e.message.split(" ").includes("SIGKILL")) {
        console.log("Файл был отменен пользователем!");
      } else {
        console.log("Ошибка в parallelConversion - startProcess", e.message);
        throw e;
      }
    }
  }
};