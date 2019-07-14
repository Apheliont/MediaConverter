const io = require("socket.io-client");
const db = require("../database/main");
const settings = require("./settings");
const { informClients } = require("../socket.io-server");
const informAboutWatcher = informClients("WATCHERINFO");
const fwpathModel = require("./fwpath");
const { fileModel, workerModel } = require("./fileWorkerFusion");

module.exports = (function() {
  class Watcher {
    constructor({ id, host, port }) {
      this.id = id;
      this.host = host;
      this.port = port;
      this.status = 0; // 0 - disconnect, 1 - connect
    }

    disconnect() {
      this.socket.close();
    }

    connect() {
      this.socketIOInit();
      this.socket.open();
    }

    getInfo() {
      return {
        id: this.id,
        status: this.status
      };
    }
    // сюда вешаем все обработчики событий вебсокетов
    socketIOInit() {
      this.socket = io(
        `http://${this.host}:${this.port}`,
        Object.assign({}, settings.get("watcher"))
      );

      this.socket.on("connect", () => {
        this.status = 1;
        informAboutWatcher("WATCHERINFO", this.getInfo());
        db.getFWPaths().then(fwpaths => {
          this.socket.emit("fwpaths", fwpaths);
        });
      });

      this.socket.on("disconnect", () => {
        this.status = 0;
        informAboutWatcher("WATCHERINFO", this.getInfo());
      });

      this.socket.on("newFile", async file => {
        await fileModel.addFile(file);
        workerModel.tryProcessNext();
      });
    }
  }

  return new (class {
    constructor() {
      this.storage = [];
      // при изменении путей, распространяем инфу по всем наблюдателям
      fwpathModel.on("fwpathsChanged", this.updateFWPaths.bind(this));
    }

    getWatcherById(id) {
      return this.storage.find(watcher => watcher.id === Number(id));
    }

    updateFWPaths() {
      db.getFWPaths().then(fwpaths => {
        this.storage.forEach(watcher => {
          watcher.socket.emit("fwpaths", fwpaths);
        });
      });
    }

    async addWatcher({ host, port }) {
      try {
        const id = await db.addWatcher({ host, port });
        const newWatcher = new Watcher({ id, host, port });
        this.storage.push(newWatcher);
        setTimeout(newWatcher.connect.bind(newWatcher), 500);
        return id;
      } catch (e) {
        // обработать!
      }
    }
    // @@data: {host, port}
    async updateWatcher(id, data) {
      try {
        await db.updateWatcher(id, data);
        const watcher = this.getWatcherById(id);
        if (watcher) {
          for (const prop in data) {
            watcher[prop] = data[prop];
          }
          if (watcher.status === 1) {
            watcher.disconnect();
            setTimeout(watcher.connect.bind(watcher), 2000);
          }
        }
      } catch (e) {
        // обработать
      }
    }
    async deleteWatcher(id) {
      try {
        await db.deleteWatcher(id);
        const index = this.storage.findIndex(watcher => watcher.id === id);
        if (index !== -1) {
          // перед удалением отключаем воркер
          const watcher = this.storage[index];
          watcher.disconnect();
          this.storage.splice(index, 1);
        }
      } catch (e) {
        // обработать!
      }
    }
    getWatchers() {
      return this.storage.map(watcher => {
        return Object.assign(
          {},
          {
            id: watcher.id,
            host: watcher.host,
            port: watcher.port,
            status: watcher.status
          }
        );
      });
    }
    async restoreWatchers() {
      // выходим из функции если хранилище уже заполнено
      if (this.storage.length > 0) {
        return;
      }
      try {
        const watchers = await db.getWatchers();
        watchers.forEach(watcher => {
          const newWatcher = new Watcher(watcher);
          newWatcher.connect();
          this.storage.push(newWatcher);
        });
      } catch (e) {
        console.log("Ошибка в restoreWatchers", e.message);
      }
    }
  })();
})();
