/*
 ** Пресет это набор функций и св-в для которых нужно написать реализацию
 ** 1) O_FORMAT - указать расширение выходного файла
 ** 2) Заполнить массивы AUDIO_EXTENSIONS и/или IMAGE_EXTENSIONS и/или VIDEO_EXTENSIONS 
 **    расширениями файлов которые разрешены для кодирования и не будут отфильтрованы
 ** 3) Функция rescueStage. Её реализацию можно не трогать т.к дефолтные значения делают
 **    свою работу вполне сносно
 ** 4) Функция analyzeStage принимает на вход объект metadata и расширение файла.
 **    На основании этих данных нужно сформировать объект options значения которого
 **    будут проверяться на следующих этапах
 ** 5) Функия preparationStage. Нужна для подготовки файла перед кодированием по частям
 **    Этот этап создает промежуточный файл, в котором будут проставлены ключевые кадры 
 **    в местах в соотвествии с длиной файла и общим кол-ом CPU ресурсов в системе
 ** 6) Функция transcodeStage. Это этап кодирования по частям. Здесь задаются все параметры
 **    выходного файла
 ** 7) Функиция mergeStage. Служит для финальной склейки файла. Нужно избегать
 **    любых параметров которые могут привести к перекодированию частей на этой стадии
 **    Дефолтная реализация подходит для большинства случаев
 */

// Написать реализацию обязательно!
const O_FORMAT = ""; // формат выходного файла, например - ".mxf" 
const O_FPS = 0; // указать FPS выходного файла, например 25
const AUDIO_EXTENSIONS = []; // [".mp3", ".wav"]
const IMAGE_EXTENSIONS = []; // [".jpg", ".bmp"]
const VIDEO_EXTENSIONS = []; // [".avi", ".mpeg"]

// необязательные поля
const O_VIDEO_CODEC = "";
const O_VIDEO_BITRATE = 0;
const O_VIDEO_PIXEL = "";
const O_WIDTH = 0;
const O_HEIGHT = 0;
const O_AUDIO_SRATE = 0;
const O_AUDIO_CODEC = "";
const O_AUDIO_BITRATE = 0;
const IMAGE_DURATION = 0;


//-----------------------------------RESCUE-------------------------------------------
// попытка дать файлу второй шанс прежде чем выбросить ошибку.
// Частое явление файлы с поврежденными метаданными, недокачанные и т.д
// у которых отсутствует поле duration. Это претендент на вылет с ошибкой
function rescueStage({ inputExtension }) {
  const outputExtension = inputExtension;
  const inputOptions = [];
  const outputOptions = ["-vcodec copy", "-acodec copy"]; // скорей всего здесь ничего менять не будем
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
  const options = {};
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
  const outputExtension = "";


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
  const outputOptions = ["-map 0", "-c copy"]; // скорей всего здесь ничего менять не надо

  const ffmpegCommands = ffmpegCommandBuilder({ outputOptions });
  return {
    ffmpegCommands,
    totalFrames: totalFrames(duration)
  };
}

// --------------------------- ВСЁ ЧТО НИЖЕ НЕ ТРОГАТЬ! =)----------------------------------
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

module.exports = {
  rescueStage,
  checkExstension,
  O_FORMAT,
  analyzeStage,
  preparationStage,
  transcodeStage,
  mergeStage
};
