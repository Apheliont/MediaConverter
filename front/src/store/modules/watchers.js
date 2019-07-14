export default {
  namespaced: true,
  state: {
    watchers: []
  },
  getters: {
    watchers(state) {
      return state.watchers;
    }
  },
  mutations: {
    setWatchers(state, payload) {
      state.watchers = payload;
    },
    addWatcher(state, payload) {
      state.watchers.push(payload);
    },
    deleteWatcher(state, id) {
      const index = state.watchers.findIndex(watcher => watcher.id === id);
      if (index !== -1) {
        state.watchers.splice(index, 1);
      }
    },
    updateWatcher(state, payload) {
      const watcher = state.watchers.find(watcher => watcher.id === payload.id);
      if (watcher) {
        Object.assign(watcher, payload);
      }
    }
  },
  actions: {
    async addWatcher({ commit }, payload) {
      try {
        const url = `${process.env.VUE_APP_BACKEND_ADDRESS}/api/watchers`;
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
        const newWatcher = {
          ...payload,
          status: 0,
          ...id
        };
        commit("addWatcher", newWatcher);
        return newWatcher;
      } catch (e) {
        throw e;
      }
    },

    async deleteWatcher({ commit }, id) {
      try {
        const url = `${process.env.VUE_APP_BACKEND_ADDRESS}/api/watchers/${id}`;
        const result = await fetch(url, {
          method: "DELETE"
        });
        if (result.status !== 200) {
          throw new Error('Сервер не удалил наблюдателя');
        }
        commit("deleteWatcher", id);
      } catch (e) {
        throw e;
      }
    },

    async getWatchers({ commit }) {
      try {
        const url = `${process.env.VUE_APP_BACKEND_ADDRESS}/api/watchers`;
        const result = await fetch(url, {
          method: "GET"
        });
        if (result.status !== 200) {
          throw new Error('Сервер не вернул список наблюдателей');
        }
        const watchers = await result.json();
        commit("setWatchers", watchers);
      } catch (e) {
        throw e;
      }
    },
    async updateWatcher({ commit }, payload) {
      console.log("Updating watcher: ", payload);
      try {
        const url = `${process.env.VUE_APP_BACKEND_ADDRESS}/api/watchers/${
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
          throw new Error('Сервер не обновил наблюдатель');
        }
        commit("updateWatcher", payload);
      } catch (e) {
        throw e;
      }

    },
    async switchWatcher(_, id) {
      try {
        const url = `${
          process.env.VUE_APP_BACKEND_ADDRESS
          }/api/watchers/${id}/switch`;
        const result = await fetch(url, {
          method: "PUT"
        });
        if (result.status !== 200) {
          throw new Error('Сервер не переключил наблюдатель');
        }
      } catch (e) {
        throw e;
      }
    },
    SOCKET_WATCHERINFO({ commit }, payload) {
      commit("updateWatcher", payload);
    }
  }
};
