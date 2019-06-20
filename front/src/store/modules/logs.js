export default {
  namespaced: true,
  state: {
    logs: [],
    totalItems: 0
  },
  getters: {
    logs(state) {
      return state.logs;
    },
    totalItems(state) {
        return state.totalItems;
    }
  },
  mutations: {
    setLogs(state, payload) {
      state.logs = payload.items;
      state.totalItems = payload.totalItems;
    },
    setErrorMessage(state, payload) {
      const logToUpdate = state.logs.find(
        log => log.id === Number(payload.log_id)
      );
      if (logToUpdate) {
        logToUpdate.errorMessage = payload.errorMessage;
      }
    }
  },
  actions: {
    async getLogs(
      { commit },
      {
        descending = true,
        page = 1,
        rowsPerPage = 10,
        sortBy = "id",
        status = 0,
        search = ""
      } = {}
    ) {
      try {
        const url = `${
          process.env.VUE_APP_BACKEND_ADDRESS
        }/api/logs?status=${status}&search=${search}&page=${page}&rowsPerPage=${rowsPerPage}&sortBy=${sortBy}&descending=${descending}`;

        const result = await fetch(url, {
          method: "GET"
        });
        if (result.status !== 200) {
          throw new Error("Сервер не смог вернуть логи");
        }
        const logs = await result.json();
        // логи это объект с 2-мя св-ми: 1) items - массив самих логов
        // 2) totalItems - это int, содержащий общее число элементов с определенным
        // статусом (status). Это для паджинации
        commit("setLogs", logs);
      } catch (e) {
        throw e;
      }
    },
    async getError({ commit }, id) {
      try {
        const url = `${process.env.VUE_APP_BACKEND_ADDRESS}/api/errors/${id}`;
        const result = await fetch(url, {
          method: "GET"
        });
        if (result.status !== 200) {
          throw new Error("Сервер не смог вернуть ошибку");
        }
        const errorObj = await result.json();
        commit("setErrorMessage", errorObj);
      } catch (e) {
        throw e;
      }
    }
  }
};
