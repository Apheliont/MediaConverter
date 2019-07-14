export default {
    namespaced: true,
    state: {
      fwpaths: []
    },
    getters: {
      fwpaths(state) {
        return state.fwpaths;
      }
    },
    mutations: {
      setFWPaths(state, payload) {
        state.fwpaths = payload;
      },
      addFWPath(state, payload) {
        state.fwpaths.push(payload);
      },
      deleteFWPath(state, id) {
        const index = state.fwpaths.findIndex(fwpath => fwpath.id === id);
        if (index !== -1) {
          state.fwpaths.splice(index, 1);
        }
      },
      updateFWPath(state, payload) {
        const fwpath = state.fwpaths.find(
            fwpath => fwpath.id === payload.id
        );
        if (fwpath) {
          Object.assign(fwpath, payload);
        }
      }
    },
    actions: {
      async getFWPaths({ commit }) {
        try {
          const url = `${process.env.VUE_APP_BACKEND_ADDRESS}/api/fwpaths`;
          const result = await fetch(url, {
            method: "GET"
          });
          if (result.status !== 200) {
            throw new Error('Сервер не смог вернуть пути наблюдателей');
          }
          const fwpaths = await result.json();
          commit("setFWPaths", fwpaths);
        } catch (e) {
          throw e;
        }
  
      },
      async addFWPath({ commit }, payload) {
        try {
          const url = `${process.env.VUE_APP_BACKEND_ADDRESS}/api/fwpaths`;
          const result = await fetch(url, {
            method: "POST",
            headers: new Headers({
              "Content-Type": "application/json"
            }),
            body: JSON.stringify(payload)
          });
          if (result.status !== 200) {
            throw new Error('Сервер не добавил путь для наблюдения');
          }
          const id = await result.json();
          commit("addFWPath", {
              ...payload,
              ...id
          });
        } catch (e) {
          throw e;
        }
      },
      async updateFWPath({ commit }, payload) {
        try {
          const url = `${process.env.VUE_APP_BACKEND_ADDRESS}/api/fwpaths/${
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
            throw new Error('Сервер не обновил путь наблюдателя');
          }
          commit("updateFWPath", payload);
        } catch (e) {
          throw e;
        }
      },
      async deleteFWPath({ commit }, id) {
        try {
          const url = `${process.env.VUE_APP_BACKEND_ADDRESS}/api/fwpaths/${id}`;
          const result = await fetch(url, {
            method: "DELETE"
          });
          if (result.status !== 200) {
            throw new Error('Сервер не удалил путь наблюдателя');
          }
          commit("deleteFWPath", id);
        } catch (e) {
          throw e;
        }
      }
    }
  };
  