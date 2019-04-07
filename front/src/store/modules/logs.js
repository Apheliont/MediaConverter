export default {
    namespaced: true,
    state: {
        logs: []
    },
    getters: {
        logs(state) {
            return state.logs;
        }
    },
    mutations: {
        setLogs(state, payload) {
            state.logs = payload;
        },
    },
    actions: {
        async getLogs({ commit }) {
            try {
                const url = `${process.env.VUE_APP_BACKEND_ADDRESS}/api/logs`;
                const result = await fetch(url, {
                    method: 'GET'
                });
                if (result.status !== 200) {
                    throw new Error('Сервер не смог вернуть логи');
                }
                const logs = await result.json();
                commit('setLogs', logs);
            } catch (e) {
                throw e;
            }
        },
    }
}