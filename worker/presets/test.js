const allowedExtension = [
  ".3gp",
  ".avi",
  ".f4v",
  ".flv",
  ".h264",
  ".m4v",
  ".mkv",
  ".mov",
  ".mp4",
  ".mpeg",
  ".mpg",
  ".mts",
  ".ts",
  ".vob",
  ".webm",
  ".wmv",
  ".mxf",
  ".m2p",
  ".m2ts"
];
// -----------------------------------ANALYZE-----------------------------------------
// принимает метаданные файла после анализа ffprobe, возвращает объект options
function analyzeStage(metadata) {
  // ищем все косяки исходного файла и регистрирум их в options
  const options = {};
  options.duration = metadata.format.duration;
  options.splitAudio = false;
  options.changeStreams = false;
  options.badContainer = false;
  options.badStreams = [];
  options.timeCodeStream = false;
  options.aspectRatio = {
    definedAspect: null,
    SAR: null,
    width: null,
    height: null
  };

  options.isMute =
    metadata.streams.findIndex(stream => stream.codec_type === "audio") === -1
      ? true
      : false;

  const videoStream = metadata.streams.find(
    stream => stream.codec_type === "video"
  );

  if (!options.isMute) {
    const firstAudioStream = metadata.streams.find(
      stream => stream.codec_type === "audio"
    );

    if (firstAudioStream.channels === 2) {
      options.splitAudio = true;
    }
    // проверяем если контейнер является закрытым для кодирования в него
    if (
      firstAudioStream.codec_name === "pcm_bluray" ||
      [".m2ts", ".m2p"].includes(extension) ||
      videoStream.codec_name === "dvvideo"
    ) {
      options.badContainer = true;
    }

    // выясняем, правильность следования потоков. 1м всегда должен быть видео поток
    if (videoStream && videoStream.index !== 0) {
      options.changeStreams = true;
    }
  }

  // определяем соотношение сторон
  if (videoStream) {
    // специально оставляем свойство aspect_ratio в дополнение к SAR
    // т.к есть видео с саром не равным 1.777 но при этом аспект 16:9
    if (videoStream.display_aspect_ratio !== "N/A") {
      options.aspectRatio.definedAspect = videoStream.display_aspect_ratio;
      const aspectRatioArr = videoStream.display_aspect_ratio.split(":");
      options.aspectRatio.SAR =
        Math.floor((+aspectRatioArr[0] / +aspectRatioArr[1]) * 1000) / 1000;
    } else {
      options.aspectRatio.SAR =
        Math.floor((videoStream.width / videoStream.height) * 1000) / 1000;
      if (options.aspectRatio.SAR === 1.777) {
        options.aspectRatio.definedAspect = "16:9";
      }
    }
    if (videoStream.height !== "N/A" && videoStream.width !== "N/A") {
      options.aspectRatio.height = videoStream.height;
      options.aspectRatio.width = videoStream.width;
    }
  }

  // ищем все неопознанные стримы которые будем вырезать и записываем их
  // индексы
  metadata.streams.forEach(stream => {
    if (stream.codec_tag_string === "tmcd") {
      options.timeCodeStream = true;
    }
    if (stream.codec_name === "unknown") {
      options.badStreams.push(+stream.index);
    }
  });

  return options;
}
// -------------------------PREPARE-----------------------------
// готовит outputOptions и inputOptions
function preparationStage(options, duration) {
    const outputOptions = [];
    const inputOptions = [];

    if (options.changeStreams) {
      outputOptions.push(...["-map v:0", "-map a:1?", "-map a:0"]);
    } else {
      outputOptions.push("-map 0");
    }

    if (options.partialTranscode.isValid) {
      inputOptions.push(
        ...[
          `-ss ${options.partialTranscode.startTime}`,
          `-t ${duration}`
        ]
      );
    }

    if (options.badContainer) {
      inputOptions.push("-fflags +genpts");
      outputOptions.push(
        ...["-acodec pcm_s24le", "-ar 48000", "-ab 1152k", "-c:v copy"]
      );
    } else {
      outputOptions.push("-c copy");
    }

    // вырезаем таймкод поток
    if (options.timeCodeStream) {
      outputOptions.push(`-write_tmcd 0`);
    }

    // вырезаем все неизвестные стримы т.к они приведут к ошибке кодирования
    if (options.badStreams.length > 0) {
      options.badStreams.forEach(index => {
        outputOptions.push(`-map -0:${index}?`);
      });
}
}

function transcodeStage(options) {
    const outputOptions = [];
    const inputOptions = [];
    
    const presetName = this.options.isMute
    ? "mxf_mute"
    : this.options.splitAudio
    ? "mxf_split_audio"
    : "mxf_no_split";

  // пытаемся исправить aspect ratio
  if (options.aspectRatio.definedAspect === "16:9") {
    outputOptions.push("-s 1920:1080");
  } else if (options.aspectRatio.SAR < 1.777) {
    outputOptions.push(
      `-vf scale=${Math.round(
        1080 * options.aspectRatio.SAR
      )}:1080,pad=1920:1080:${Math.round(
        (1920 - options.aspectRatio.width) / 2
      )}:${Math.round(
        (1080 - options.aspectRatio.height) / 2
      )},setdar=1.7777`
    );
  } else {
    outputOptions.push(
      `-vf scale=1920:${Math.round(
        1920 / options.aspectRatio.SAR
      )},pad=1920:1080:${Math.round(
        (1920 - options.aspectRatio.width) / 2
      )}:${Math.round(
        (1080 - options.aspectRatio.height) / 2
      )},setdar=1.7777`
    );
  }

  // для ускорения конвертации используем хак ffmpeg - быстрый, но неточный поиск в
  // inputOptions он ищет по key frames. Остаток пути проходится медленным поиском
  // он перебирает каждый кадр за кадром. Таким образом получаем и быстро и точно


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
}
// --------------------------------------------------------------------------
