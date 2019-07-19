// настройки воркера
module.exports = {
  condition: {
    fileIDs: {}, // используется для хранения ключей файлов и связанных с ними объектов ffmpeg'a под названием commands
    addFileCommand(id, command) {
      if (!(id in this.fileIDs)) {
        this.fileIDs[id] = new Set();
      }
      if (typeof command !== undefined) {
        this.fileIDs[id].add(command);
      }
    },
    deleteFileCommand(id, command) {
      if (id in this.fileIDs && typeof command !== undefined) {
        this.fileIDs[id].delete(command);
        if (this.fileIDs[id].size === 0) {
          delete this.fileIDs[id];
        }
      }
    },
    getFileCommandsById(id) {
      if (id in this.fileIDs) {
        return Array.from(this.fileIDs[id]);
      }
      return [];
    },
    getAllFileCommands() {
      const allCommands = [];
      const keys = Object.keys(this.fileIDs);
      for (const key of keys) {
        allCommands.push(...Array.from(this.fileIDs[key]));
      }
      return allCommands;
    },
    deleteAllCommands() {
      this.fileIDs = {};
    }
  },
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
  sourcePath: undefined,
  tempFolderName: undefined,
  categories: undefined
};
