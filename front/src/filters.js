import Vue from "vue";

Vue.filter("humanReadableSize", function(value) {
  return `${(value / (1024 * 1024)).toFixed(2)} Mb`;
});
Vue.filter("durationToHR", function(value) {
  if (!value) {
    return "--/--/--";
  }
  const date = new Date(null);
  date.setSeconds(value);
  return date.toISOString().substr(11, 8);
});

Vue.filter("workerIDToHR", function(value) {
  return value.length === 0 ? "---" : value.join(",");
});

Vue.filter("stageToText", function(value) {
  if (value > 2 || value < 0) return "Неверное значение";
  return ["Подготовка", "Кодирование", "Склейка"][value];
});

Vue.filter("statusToText", function(value) {
  return ["Завершено", "Ошибка", "В работе", "Ожидание", "Удален"][value];
});
