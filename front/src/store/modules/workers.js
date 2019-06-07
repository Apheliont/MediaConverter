export default {
  namespaced: true,
  state: {
    workers: []
  },
  getters: {
    workers(state) {
      return state.workers;
    }
  },
  mutations: {
    setWorkers(state, payload) {
      state.workers = payload;
    },
    addWorker(state, payload) {
      state.workers.push(payload);
    },
    deleteWorker(state, id) {
      const index = state.workers.findIndex(worker => worker.id === id);
      if (index !== -1) {
        state.workers.splice(index, 1);
      }
    },
    updateWorker(state, payload) {
      const worker = state.workers.find(worker => worker.id === payload.id);
      if (worker) {
        Object.assign(worker, payload);
      }
    }
  },
  actions: {
    async addWorker({ commit }, payload) {
      try {
        const url = `${process.env.VUE_APP_BACKEND_ADDRESS}/api/workers`;
        const result = await fetch(url, {
          method: "POST",
          headers: new Headers({
            "Content-Type": "application/json"
          }),
          body: JSON.stringify(payload)
        });
        if (result.status !== 200) {
          throw new Error('Сервер не добавил обработчик');
        }
        const id = await result.json();
        const newWorker = {
          ...payload,
          state: {
            message: "неизвестно",
            fileIDs: {}, // key - fileID, value - кол-во частей файла
            idleCores: 0,
            status: 0,
            physicalCores: 0
          },
          ...id
        };
        commit("addWorker", newWorker);
        return newWorker;
      } catch (e) {
        throw e;
      }
    },

    async deleteWorker({ commit }, id) {
      try {
        const url = `${process.env.VUE_APP_BACKEND_ADDRESS}/api/workers/${id}`;
        const result = await fetch(url, {
          method: "DELETE"
        });
        if (result.status !== 200) {
          throw new Error('Сервер не удалил обработчик');
        }
        commit("deleteWorker", id);
      } catch (e) {
        throw e;
      }
    },

    async getWorkers({ commit }) {
      try {
        const url = `${process.env.VUE_APP_BACKEND_ADDRESS}/api/workers`;
        const result = await fetch(url, {
          method: "GET"
        });
        if (result.status !== 200) {
          throw new Error('Сервер не вернул список обработчиков');
        }
        const workers = await result.json();
        commit("setWorkers", workers);
      } catch (e) {
        throw e;
      }
    },
    async updateWorker({ commit }, payload) {
      try {
        const url = `${process.env.VUE_APP_BACKEND_ADDRESS}/api/workers/${
          payload.id
          }`;
        const result = await fetch(url, {
          method: "PUT",
          headers: new Headers({
            "Content-Type": "application/json"
          }),
          body: JSON.stringify(payload)
        });
        if (result.status !== 200) {
          throw new Error('Сервер не обновил обработчик');
        }
        commit("updateWorker", payload);
      } catch (e) {
        throw e;
      }

    },
    async switchWorker(_, id) {
      try {
        const url = `${
          process.env.VUE_APP_BACKEND_ADDRESS
          }/api/workers/${id}/switch`;
        const result = await fetch(url, {
          method: "PUT"
        });
        if (result.status !== 200) {
          throw new Error('Сервер не переключил обработчик');
        }
      } catch (e) {
        throw e;
      }
    },
    SOCKET_WORKERINFO({ commit }, payload) {
      commit("updateWorker", payload);
    }
  }
};
