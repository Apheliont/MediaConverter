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
    // определите расширения файлов: ".mp4", ".avi"...
  ];
  return allowedExtension.includes(extension.toLowerCase());
}

function totalFrames(duration) {
  return duration * YOUR_FRAME_RATE; // вместо YOUR_FRAME_RATE укажите свое число кадров/сек;
}

function outputFormat() {
  return ".XXX"; // укажите свой формат на выходе
}
// -----------------------------------ANALYZE-----------------------------------------
// принимает метаданные файла после анализа ffprobe и расширение, возвращает объект options и
// св-во duration
function analyzeStage({ metadata, extension }) {
  const duration = metadata.format.duration;
  // заполняйте объект options любыми данными которые необходимы на основании метаданных
  // и расширения файла
  const options = {};
  return { options, duration };
}
// -------------------------PREPARE-----------------------------
// готовит outputOptions, inputOptions
// и extension(расширение на выходе этой стадии)
function preparationStage({ options, duration, inputExtension }) {
  // на основе данных в объекте options, который был подготовлен на этапе analyze
  // написать конкретные команды ffmpega и разместить их в массивах outputOptions и/или
  // inputOptions. Внимание! Эти комманды для этапа подготовки файла!
  const outputOptions = [];
  const inputOptions = [];
  const outputExtension = inputExtension; // напишите свою логику


  return {
    outputExtension,
    inputOptions,
    outputOptions
  };
}
//---------------------------------TRANSCODE STAGE ---------------------------
function transcodeStage({ options, duration }) {
    // на основе данных объекта options, который был подготовлен на этапе analyze
  // написать конкретные команды ffmpega и разместить их в массивах outputOptions и/или
  // inputOptions. Внимание! Эти комманды для этапа кодирования!
  const outputOptions = [];
  const inputOptions = [];
  const totalFramesInPart = totalFrames(duration);

  
  return {
    inputOptions,
    outputOptions,
    totalFramesInPart
  };
}
// -----------------------------MERGE STAGE------------------------------------

function mergeStage(duration) {
  // как правило здесь ничего кастомного прописывать не нужно, т.к этот этап
  // предполагает только склейку файлов
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
