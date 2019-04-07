
export default {
  namespaced: true,
  state: {
    allowedExtension: [
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
    ],
    files: [],
    uploadPercent: 0,
    xhrObjects: new Set()
  },
  getters: {
    allowedExtension(state) {
      return state.allowedExtension;
    },
    files(state) {
      return state.files;
    },
    uploadPercent(state) {
      return state.uploadPercent;
    },
    xhrObjects(state) {
      return state.xhrObjects;
    }
  },
  mutations: {
    setUploadPercent(state, payload) {
      state.uploadPercent = payload;
    },
    setXhrObject(state, obj) {
      state.xhrObjects.add(obj);
    },
    resetXhrObjects(state) {
      state.xhrObjects = new Set();
    },
    setFiles(state, payload) {
      state.files = payload;
    },
    updateFile(state, payload) {
      const fileId = payload.id;
      const fileToUpdate = state.files.find(file => file.id === fileId);
      if (fileToUpdate) {
        for (let prop in payload) {
          fileToUpdate[prop] = payload[prop];
        }
      }
    },
    addFile(state, payload) {
      state.files.push(payload);
    },
    deleteFile(state, id) {
      const fileIndexToDelete = state.files.findIndex(
        file => file.id === id
      );
      if (fileIndexToDelete !== -1) {
        state.files.splice(fileIndexToDelete, 1);
      }
    }
  },
  actions: {
    uploadFiles({ commit, getters }, filesArr) {
      commit('resetXhrObjects');
      commit("setUploadPercent", 0);

      const url = `${process.env.VUE_APP_BACKEND_ADDRESS}/api/files/upload`;
      //вычисляем общий процент закачки
      const arrayOfParts = [];
      const currentProgress = (arrayOfParts) => {
        const total = arrayOfParts.reduce((sum, next) => {
          return sum + next;
        }, 0);
        return Math.round((total / filesArr.length) * 100);
      }

      function sender(file, index) {
        // если такой файл уже есть то не закачиваем
        if (getters.files.findIndex(fl => fl.fileName === file.fileName) !== -1) {
          arrayOfParts[index] = 1;
          commit("setUploadPercent", currentProgress(arrayOfParts));
          return;
        }

        const formData = new FormData();
        for (let prop of Object.keys(file)) {
          if (prop === 'index') {
            continue;
          }
          if (typeof file[prop] === 'object') {
            formData.append(prop, file[prop]);
          } else {
            formData.append(prop, file[prop].toString());
          }
        }
        const fileNameEncoded = window.btoa(
          encodeURIComponent(file.fileName + file.extension)
        );

        const xhr = new XMLHttpRequest();
        xhr.open('POST', url, true);
        xhr.setRequestHeader('File-Name', fileNameEncoded);


        xhr.upload.onloadstart = () => {
          commit("setXhrObject", xhr);
        }

        xhr.upload.onprogress = (event) => {
          arrayOfParts[index] = event.loaded / event.total;
          commit("setUploadPercent", currentProgress(arrayOfParts));
        }

        xhr.send(formData);
      }

      filesArr.forEach(sender);
    },

    async getFiles({ commit }) {
      try {
        const url = `${process.env.VUE_APP_BACKEND_ADDRESS}/api/files`;
        const result = await fetch(url, {
          method: 'GET'
        });
        if (result.status !== 200) {
          throw new Error('Сервер не смог вернуть файлы');
        }
        const files = await result.json();
        commit('setFiles', files);
      } catch(e) {
        throw e;
      }
    },
    deleteFile(_, id) {
      const url = `${process.env.VUE_APP_BACKEND_ADDRESS}/api/files/${id}`;
      fetch(url, {
        method: 'DELETE'
      })
    },
    cancelUpload({ getters }) {
      const xhrs = getters.xhrObjects;
      for (let xhr of xhrs) {
        xhr.abort();
      }
    },
    SOCKET_UPDATEFILE({ commit }, payload) {
      commit("updateFile", payload);
    },
    SOCKET_DELETEFILE({ commit }, id) {
      commit("deleteFile", id);
    },
    SOCKET_ADDFILE({ commit }, payload) {
      commit("addFile", payload);
    }
  }
};
