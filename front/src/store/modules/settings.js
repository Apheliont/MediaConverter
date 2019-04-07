export default {
  namespaced: true,
  state: {
    settings: {}
  },
  getters: {
    settings(state) {
      return state.settings;
    }
  },
  mutations: {
    setSettings(state, payload) {
      state.settings = payload;
    }
  },
  actions: {
    async pullSettings({ commit }) {
      try {
        const url = `${process.env.VUE_APP_BACKEND_ADDRESS}/api/settings`;
        const result = await fetch(url, {
          method: "GET"
        });
        if (result.status !== 200) {
          throw new Error('Сервер не передал настройки');
        }
        const data = await result.json();
        commit("setSettings", data);
      } catch (e) {
        throw e;
      }
    },
    async pushSettings({ commit }, payload) {
      try {
        const url = `${process.env.VUE_APP_BACKEND_ADDRESS}/api/settings`;
        const result = await fetch(url, {
          method: "POST",
          headers: new Headers({
            "Content-Type": "application/json"
          }),
          body: JSON.stringify(payload)
        });
        if (result.status !== 200) {
          throw new Error('Сервер не сохранил настройки');
        }
        commit("setSettings", payload);
      } catch (e) {
        throw e;
      }
    }
  }
};
