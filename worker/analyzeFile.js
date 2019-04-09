const FfmpegCommand = require("fluent-ffmpeg");

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

function checkFile(extension) {
  return new Promise((resolve, reject) => {
    if (!allowedExtension.includes(extension.toLowerCase())) {
      reject(new Error("Неверный формат файла!"));
    }
    resolve();
  });
}

function getFileMetadata(file) {
  return new Promise((resolve, reject) => {
    command = new FfmpegCommand(file).ffprobe((err, metadata) => {
      if (err) {
        reject(err.message);
      }
      resolve(metadata);
    });
  });
}

function getOptions({ metadata, extension }) {
  // ищем все косяки исходного файла и регистрирум их в options
  const options = {};
  options.metadata = metadata;
  options.splitAudio = false;
  options.changeStreams = false;
  options.badContainer = false;
  options.badStreams = [];
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
      videoStream.codec_name === 'dvvideo'
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
    if (stream.codec_name === "unknown") {
      options.badStreams.push(+stream.index);
    }
  });
  return options;
}

module.exports = async function analyze({ extension, file }) {
  try {
    await checkFile(extension);
    const metadata = await getFileMetadata(file);
    return getOptions({ metadata, extension });
  } catch (e) {
    throw e;
  }
};
