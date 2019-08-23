const EventEmitter = require("events");
// настройки воркера
module.exports = {
  condition: new (class extends EventEmitter {
    constructor() {
      super();
      // key - fileID, value - Object command(ffmpeg)
      this.fileCommands = {};
      // key - command, value - Object {progress: <int>, part: <int>}
      this.fileProgress = new WeakMap();
    }

    // progressObj = {progress: <int>, part: <int>}; part = -1 если это не часть
    setProgress(command, progressObj) {
      this.fileProgress.set(command, progressObj);
    }
    addFileCommand(id, command) {
      if (!(id in this.fileCommands)) {
        this.fileCommands[id] = new Set();
      }
      if (typeof command !== undefined) {
        this.fileCommands[id].add(command);
        this.emit("newTask");
      }
    }
    deleteFileCommand(id, command) {
      if (id in this.fileCommands && typeof command !== undefined) {
        this.fileCommands[id].delete(command);
        if (this.fileCommands[id].size === 0) {
          delete this.fileCommands[id];
        }
      }
    }
    getFileCommandsById(id) {
      if (id in this.fileCommands) {
        return Array.from(this.fileCommands[id]);
      }
      return [];
    }
    getAllFileCommands() {
      const allCommands = [];
      const keys = Object.keys(this.fileCommands);
      for (const key of keys) {
        allCommands.push(...Array.from(this.fileCommands[key]));
      }
      return allCommands;
    }
    deleteAllCommands() {
      // не заменяем объект новым а только вычищаем все св-ва,
      // т.к ссылка на этот объект используется в progressUpdater
      for (const prop in this.fileCommands) delete this.fileCommands[prop];
    }
  })(),
  getPreset(categoryID) {
    try {
      const category = this.categories.find(
        cat => cat.id === Number(categoryID)
      );
      if (!category) {
        throw new Error("Не найдено соотвествие ID и категории");
      } else if (!("preset" in category)) {
        throw new Error("У категории не назначен пресет");
      }
      const presetName = category.preset;
      return require(`./presets/${presetName}`);
    } catch (e) {
      if (e.code === "MODULE_NOT_FOUND") {
        throw new Error(`Пресет для категории не найден в директории presets`);
      } else {
        throw e;
      }
    }
  },
  workerID: undefined,
  physicalCores: 0,
  totalPhysicalCores: 0,
  sourcePath: "",
  tempFolderName: "",
  stashPath: "",
  categories: undefined
};
