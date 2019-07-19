const FfmpegCommand = require("fluent-ffmpeg");
const path = require("path");

function checkFile(cb, extension) {
  if (!cb(extension)) {
    throw new Error("Неверный формат файла");
  }
}

function getFileMetadata(file) {
  return new Promise((resolve, reject) => {
    new FfmpegCommand(file).ffprobe((err, metadata) => {
      if (err) {
        reject(err.message);
      }
      resolve(metadata);
    });
  });
}

module.exports = async function analyze({
  fileName,
  extension,
  sourcePath,
  preset
}) {
  try {
    checkFile(preset.checkExstension, extension);
    const metadata = await getFileMetadata(
      path.join(sourcePath, `${fileName}${extension}`)
    );
    return preset.analyzeStage({ metadata, extension });
  } catch (e) {
    throw e;
  }
};
