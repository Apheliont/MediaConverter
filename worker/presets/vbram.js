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
const O_FORMAT = ".mxf"; // PUBLIC! Написать реализацию обязательно!
const O_VIDEO_CODEC = "mpeg2video";
const O_VIDEO_BITRATE = 50000000;
const O_VIDEO_PIXEL = "yuv422p";
const O_WIDTH = 1920;
const O_HEIGHT = 1080;
const O_FPS = 25;
const O_AUDIO_SRATE = 48000;
const O_AUDIO_CODEC = "pcm_s24le";
const O_AUDIO_BITRATE = 1152;
const IMAGE_DURATION = 5;
const AUDIO_EXTENSIONS = [".wav", ".mp3", ".ogg", ".flac"];
const IMAGE_EXTENSIONS = [".jpeg", ".jpg", ".png", ".bmp", ".tif"];
const VIDEO_EXTENSIONS = [
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
  ".m2ts",
  ".m2p"
];

function checkExstension(extension) {
  const allowedExtension = [
    ...AUDIO_EXTENSIONS,
    ...IMAGE_EXTENSIONS,
    ...VIDEO_EXTENSIONS
  ];
  return allowedExtension.includes(extension.toLowerCase());
}

function ffmpegCommandBuilder({
  input,
  inputOptions = [],
  outputOptions = []
}) {
  if (input !== undefined) {
    return function(ffmpeg) {
      ffmpeg
        .input(input)
        .inputOptions(inputOptions)
        .outputOptions(outputOptions);
    };
  }
  return function(ffmpeg) {
    ffmpeg.inputOptions(inputOptions).outputOptions(outputOptions);
  };
}

function totalFrames(duration) {
  return duration * O_FPS;
}
//-----------------------------------RESCUE-------------------------------------------
// попытка дать файлу второй шанс прежде чем выбросить ошибку.
// Частое явление файлы с поврежденными метаданными, недокачанные и т.д
// у которых отсутствует поле duration. Это претендент на вылет с ошибкой
function rescueStage({ inputExtension }) {
  const outputExtension = inputExtension;
  const inputOptions = [];
  const outputOptions = ["-vcodec copy", "-acodec copy"];
  const ffmpegCommands = ffmpegCommandBuilder({ inputOptions, outputOptions });
  return {
    ffmpegCommands,
    outputExtension
  };
}
// -----------------------------------ANALYZE-----------------------------------------
// принимает метаданные файла после анализа ffprobe и расширение,
// возвращает объект options и св-во duration
function analyzeStage({ metadata, extension }) {
  let duration = metadata.format.duration;
  // ищем все косяки исходного файла и регистрирум их в options
  const options = {
    audio: {
      isAudio: false,
      splitAudio: false,
      isMute: false
    },
    // это дефолт для файлов без видео потока.
    // Если видео есть, то поле перезапишется
    originalFrameRate: O_FPS,
    isImage: false,
    changeStreams: false,
    badContainer: false,
    badStreams: [],
    timeCodeStream: false,
    aspectRatio: {
      definedAspect: null,
      SAR: null,
      width: null,
      height: null
    }
  };
  if (IMAGE_EXTENSIONS.includes(extension.toLowerCase())) {
    options.isImage = true;
    duration = IMAGE_DURATION;
    //options.audio.isMute будет установленно далее
  }

  if (AUDIO_EXTENSIONS.includes(extension.toLowerCase())) {
    options.audio.isAudio = true;
    options.audio.splitAudio = true;
    // сразу возвращаем объект options, дальше никакие проверки для аудио не актуальны
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
      firstAudioStream.codec_name === "pcm_s16be" ||
      firstAudioStream.codec_name === "pcm_s32le" ||
      firstAudioStream.codec_name === "pcm_dvd" ||
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
    // фрэймрейт у оригинального файла, для расчетов процентов на стадии подготовки
    const FPSinDivisionForm = videoStream.r_frame_rate.split("/");
    const numerator = FPSinDivisionForm[0];
    const denumerator = FPSinDivisionForm[1];
    if (isFinite(numerator / denumerator)) {
      options.originalFrameRate = numerator / denumerator;
    }
  } else {
    // если видео-стрим не найден, и при этом файл не принадлежит к чистым аудио форматам
    // предполагаем что это медиа контейнер с аудио дорожкой
    options.audio.isAudio = true;
  }

  // ищем все отличные от аудио и видео стримы
  // которые будем вырезать и записываем их индексы
  metadata.streams.forEach(stream => {
    if (stream.codec_tag_string === "tmcd") {
      options.timeCodeStream = true;
    }
    if (!(stream.codec_type === "video" || stream.codec_type === "audio")) {
      options.badStreams.push(+stream.index);
    }
  });
  return { options, duration };
}
// -------------------------PREPARE-----------------------------
// готовит outputOptions, inputOptions
// и extension(расширение на выходе этой стадии)
function preparationStage({
  options,
  duration,
  inputExtension
}) {
  const inputOptions = [];
  const outputOptions = [];
  const outputExtension = options.badContainer
    ? ".mov"
    : options.isImage || options.audio.isAudio
    ? O_FORMAT
    : inputExtension;

  // если файл - картинка
  if (options.isImage) {
    const ih =
      options.aspectRatio.height % 2 === 0
        ? options.aspectRatio.height
        : options.aspectRatio.height + 1;
    const iw =
      options.aspectRatio.width % 2 === 0
        ? options.aspectRatio.width
        : options.aspectRatio.width + 1;

    inputOptions.push(...["-loop 1", `-framerate ${O_FPS}`]);
    outputOptions.push(
      ...[
        `-vf scale=${iw}:${ih}`,
        "-c:v libx264",
        `-pix_fmt ${O_VIDEO_PIXEL}`,
        `-t ${duration}`
      ]
    );
    const ffmpegCommands = ffmpegCommandBuilder({
      inputOptions,
      outputOptions
    });
    // для картинки больше никакие данные не нужны, возвращаем настройки
    return {
      ffmpegCommands,
      outputExtension
    };
  }

  // позиция имеет значение!
  if (options.partialTranscode.isValid) {
    inputOptions.push(
      ...[`-ss ${options.partialTranscode.startTime}`, `-t ${duration}`]
    );
  }
  // если файл - аудио файл
  if (options.audio.isAudio) {
    inputOptions.push(
      ...["-f lavfi", `-i color=c=black:s=${O_WIDTH}x${O_HEIGHT}`]
    );
    outputOptions.push(
      ...["-ac 2", `-ar ${O_AUDIO_SRATE}`, "-shortest", "-tune stillimage"]
    );
    // настройки длительности получили, черную подложку тоже.
    // Возвращаем данные, дальше ловить нечего
    const ffmpegCommands = ffmpegCommandBuilder({
      inputOptions,
      outputOptions
    });
    return {
      ffmpegCommands,
      outputExtension
    };
  }

  if (options.changeStreams) {
    outputOptions.push(...["-map v:0", "-map a:1?", "-map a:0"]);
  } else {
    outputOptions.push("-map 0");
  }

  if (options.badContainer) {
    inputOptions.push("-fflags +genpts");
    outputOptions.push(
      ...[
        `-acodec ${O_AUDIO_CODEC}`,
        `-ar ${O_AUDIO_SRATE}`,
        `-ab ${O_AUDIO_BITRATE}k`,
        "-c:v copy"
      ]
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
  // вырезаем все субтитры
  outputOptions.push("-sn");

  const ffmpegCommands = ffmpegCommandBuilder({ inputOptions, outputOptions });
  return {
    ffmpegCommands,
    outputExtension
  };
}
//---------------------------------TRANSCODE STAGE ---------------------------
function transcodeStage({ options, duration }) {
  let input;
  const outputOptions = [];
  const inputOptions = [];
  const totalFramesInPart = totalFrames(duration);

  // общие параметры выходного файла
  outputOptions.push(
    ...[
      `-vcodec ${O_VIDEO_CODEC}`,
      `-b:v ${O_VIDEO_BITRATE}`,
      `-minrate ${O_VIDEO_BITRATE}`,
      `-maxrate ${O_VIDEO_BITRATE}`,
      `-pix_fmt ${O_VIDEO_PIXEL}`,
      `-r ${O_FPS}`,
      "-bf 2",
      "-flags +cgop",
      "-b_strategy 0",
      "-mpv_flags +strict_gop",
      "-sc_threshold 1000000000",
      "-flags +ildct+ilme",
      "-top 1",
      `-c:a ${O_AUDIO_CODEC}`,
      `-ar ${O_AUDIO_SRATE}`,
      `-ab ${O_AUDIO_BITRATE}k`
    ]
  );
  if (options.audio.isMute) {
    input = `anullsrc=channel_layout=2:sample_rate=${O_AUDIO_SRATE}`;
    inputOptions.push("-f lavfi");
    outputOptions.push(
      ...[
        "-filter_complex",
        "asplit = 2[o1][o2]", // разбиваем 1 стерео на 2 моно
        "-map 0:v:0",
        "-map [o1]",
        "-map [o2]",
        "-shortest"
      ]
    );
  } else if (options.audio.splitAudio) {
    outputOptions.push(
      ...[
        "-filter_complex",
        "[0:1:a]channelsplit[a1][a2]", // разбиваем 1 стерео на 2 моно
        "-map 0:v:0",
        "-map [a1]",
        "-map [a2]"
      ]
    );
  } else {
    outputOptions.push(...["-map 0"]);
  }

  //пытаемся исправить aspect ratio
  if (!options.audio.isAudio) {
    if (options.aspectRatio.definedAspect === "16:9") {
      outputOptions.push(`-s ${O_WIDTH}:${O_HEIGHT}`);
    } else if (options.aspectRatio.SAR < 1.777) {
      outputOptions.push(
        `-vf scale=${Math.round(
          O_HEIGHT * options.aspectRatio.SAR
        )}:${O_HEIGHT},pad=${O_WIDTH}:${O_HEIGHT}:${Math.round(
          (O_WIDTH - options.aspectRatio.width) / 2
        )}:${Math.round(
          (O_HEIGHT - options.aspectRatio.height) / 2
        )},setdar=16/9`
      );
    } else {
      outputOptions.push(
        `-vf scale=${O_WIDTH}:${Math.round(
          O_WIDTH / options.aspectRatio.SAR
        )},pad=${O_WIDTH}:${O_HEIGHT}:${Math.round(
          (O_WIDTH - options.aspectRatio.width) / 2
        )}:${Math.round(
          (O_HEIGHT - options.aspectRatio.height) / 2
        )},setdar=16/9`
      );
    }
  }

  const ffmpegCommands = ffmpegCommandBuilder({
    input,
    inputOptions,
    outputOptions
  });

  return {
    ffmpegCommands,
    totalFramesInPart
  };
}
// -----------------------------MERGE STAGE------------------------------------

function mergeStage({ duration }) {
  const outputOptions = ["-map 0", "-c copy"];

  const ffmpegCommands = ffmpegCommandBuilder({ outputOptions });
  return {
    ffmpegCommands,
    totalFrames: totalFrames(duration)
  };
}

module.exports = {
  rescueStage,
  checkExstension,
  O_FORMAT,
  analyzeStage,
  preparationStage,
  transcodeStage,
  mergeStage
};
