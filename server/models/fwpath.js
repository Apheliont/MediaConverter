const db = require("../database/main");
const EventEmitter = require("events");

// все ошибки будут обрабатаны в контроллере
module.exports = new (class extends EventEmitter {
  constructor() {
    super();
  }

  async getFWPaths() {
    return await db.getFWPaths();
  }

  async addFWPath(data) {
    const id = await db.addFWPath(data);
    this.emit("fwpathsChanged");
    return id;
  }

  async deleteFWPath(id) {
    await db.deleteFWPath(id);
    this.emit("fwpathsChanged");
  }

  async updateFWPath(data) {
    await db.updateFWPath(data);
    this.emit("fwpathsChanged");
  }
})();
