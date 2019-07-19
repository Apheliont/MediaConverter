/*
 ** Пресет это набор функций для которых нужно написать реализацию
 ** 1) Функция проверки расширения файла.
 ** 2) Функция которая создает объект options на основании метаданных файла.
 **    Объект options это набор свойств которые будут обработаны на следующем этапе
 **    На основании этих св-в создаются конкретные команды для ffmpeg
 ** 3) Функция подготовки файла. Реализует конкретные команды для ffmpeg
 **    на основании объекта options полученного с предыдущего этапа
 ** 4) Функция создающая конкретные команды для ffmpeg для этапа кодирования
 **    по частям, на основе объекта options
 ** 5) Функия создающая конкретные команды для ffmpeg для этапа склейки
 ** 6) Функция возвращающая струку выходного формата вида .mxf...
 ** 7) Функиция возвращающая число кадров на основании длительности
 */
function checkExstension(extension) {
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
    ".m2ts",
    ".wav",
    ".mp3",
    ".m2p",
    ".flac"
  ];
  return allowedExtension.includes(extension.toLowerCase());
}

function totalFrames(duration) {
  return duration * 25;
}

function outputFormat() {
  return ".mxf";
}
// -----------------------------------ANALYZE-----------------------------------------
// принимает метаданные файла после анализа ffprobe и расширение, возвращает объект options и
// св-во duration
function analyzeStage({ metadata, extension }) {
  const duration = metadata.format.duration;
  // ищем все косяки исходного файла и регистрирум их в options
  const options = {};
  // далее идут опциональные св-ва
  options.audio = {
    isAudioFormat: false,
    splitAudio: false,
    isMute: false
  };
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

  if ([".wav", ".m2p", ".mp3", ".flac"].includes(extension.toLowerCase())) {
    options.audio.isAudioFormat = true;
    options.audio.splitAudio = true;
    return { options, duration };
  }

  const videoStream = metadata.streams.find(
    stream => stream.codec_type === "video"
  );

  options.audio.isMute =
    metadata.streams.findIndex(stream => stream.codec_type === "audio") === -1
      ? true
      : false;

  if (!options.audio.isMute) {
    const firstAudioStream = metadata.streams.find(
      stream => stream.codec_type === "audio"
    );

    if (firstAudioStream.channels === 2) {
      options.audio.splitAudio = true;
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

  return { options, duration };
}
// -------------------------PREPARE-----------------------------
// готовит outputOptions, inputOptions
// и extension(расширение на выходе этой стадии)
function preparationStage({ options, duration, inputExtension }) {
  const outputOptions = [];
  const inputOptions = [];
  const outputExtension =
    options.audio.isAudioFormat || options.badContainer
      ? ".mkv"
      : inputExtension;

  if (options.audio.isAudioFormat) {
    inputOptions.push(...["-f lavfi", "-i color=c=black:s=1920x1280"]);
    outputOptions.push(
      ...[
        "-c:a copy",
        "-ac 2",
        "-shortest",
        "-tune stillimage"
      ]
    );
  }

  if (options.changeStreams) {
    outputOptions.push(...["-map v:0", "-map a:1?", "-map a:0"]);
  } else if (!options.audio.isAudioFormat) {
    outputOptions.push("-map 0");
  }

  if (options.partialTranscode.isValid) {
    inputOptions.push(
      ...[`-ss ${options.partialTranscode.startTime}`, `-t ${duration}`]
    );
  }

  if (options.badContainer) {
    inputOptions.push("-fflags +genpts");
    outputOptions.push(
      ...["-acodec pcm_s24le", "-ar 48000", "-ab 1152k", "-c:v copy"]
    );
  } else if (!options.audio.isAudioFormat) {
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
  // вырезаем все субтитры
  if (!options.audio.isAudioFormat) {
    outputOptions.push("-sn");
  }

  return {
    outputExtension,
    inputOptions,
    outputOptions
  };
}
//---------------------------------TRANSCODE STAGE ---------------------------
function transcodeStage({ options, duration }) {
  const outputOptions = [];
  const inputOptions = [];
  const totalFramesInPart = totalFrames(duration);

  if (options.isMute) {
    inputOptions.push(
      ...["-i anullsrc=channel_layout=2:sample_rate=48000", "-f lavfi"]
    );
    outputOptions.push(
      ...[
        "-filter_complex",
        "asplit = 2[o1][o2]", // разбиваем 1 стерео на 2 моно
        "-map 0:v:0",
        "-map [o1]",
        "-map [o2]",
        "-f mxf",
        "-vcodec mpeg2video",
        "-b:v 50000000",
        "-minrate 50000000",
        "-maxrate 50000000",
        "-r 25",
        "-bf 2",
        "-flags +cgop",
        "-b_strategy 0",
        "-mpv_flags +strict_gop",
        "-sc_threshold 1000000000",
        "-pix_fmt yuv422p",
        "-flags +ildct+ilme",
        "-top 1",
        "-c:a pcm_s24le",
        "-ab 1152k"
      ]
    );
  } else if (options.splitAudio) {
    outputOptions.push(
      ...[
        "-filter_complex",
        "[0:1:a]channelsplit[a1][a2]", // разбиваем 1 стерео на 2 моно
        "-map 0:v:0",
        "-map [a1]",
        "-map [a2]",
        "-f mxf",
        "-vcodec mpeg2video",
        "-b:v 50000000",
        "-minrate 50000000",
        "-maxrate 50000000",
        "-r 25",
        "-bf 2",
        "-flags +cgop",
        "-b_strategy 0",
        "-mpv_flags +strict_gop",
        "-sc_threshold 1000000000",
        "-pix_fmt yuv422p",
        "-flags +ildct+ilme",
        "-top 1",
        "-c:a pcm_s24le",
        "-ar 48000",
        "-ab 1152k"
      ]
    );
  } else {
    outputOptions.push(
      ...[
        "-map 0",
        "-f mxf",
        "-vcodec mpeg2video",
        "-b:v 50000000",
        "-minrate 50000000",
        "-maxrate 50000000",
        "-r 25",
        "-bf 2",
        "-flags +cgop",
        "-b_strategy 0",
        "-mpv_flags +strict_gop",
        "-sc_threshold 1000000000",
        "-pix_fmt yuv422p",
        "-flags +ildct+ilme",
        "-top 1",
        "-c:a pcm_s24le",
        "-ar 48000",
        "-ab 1152k"
      ]
    );
  }

  // пытаемся исправить aspect ratio
  if (options.aspectRatio.definedAspect === "16:9") {
    outputOptions.push("-s 1920:1080");
  } else if (options.aspectRatio.SAR < 1.777) {
    outputOptions.push(
      `-vf scale=${Math.round(
        1080 * options.aspectRatio.SAR
      )}:1080,pad=1920:1080:${Math.round(
        (1920 - options.aspectRatio.width) / 2
      )}:${Math.round((1080 - options.aspectRatio.height) / 2)},setdar=1.7777`
    );
  } else if (!options.audio.isAudioFormat) {
    outputOptions.push(
      `-vf scale=1920:${Math.round(
        1920 / options.aspectRatio.SAR
      )},pad=1920:1080:${Math.round(
        (1920 - options.aspectRatio.width) / 2
      )}:${Math.round((1080 - options.aspectRatio.height) / 2)},setdar=1.7777`
    );
  }
  return {
    inputOptions,
    outputOptions,
    totalFramesInPart
  };
}
// -----------------------------MERGE STAGE------------------------------------

function mergeStage(duration) {
  const outputOptions = ["-map 0", "-c copy"];

  return {
    outputOptions,
    totalFrames: totalFrames(duration)
  };
}

module.exports = {
  checkExstension,
  outputFormat,
  analyzeStage,
  preparationStage,
  transcodeStage,
  mergeStage
};
