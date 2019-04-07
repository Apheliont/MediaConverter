export default {
  namespaced: true,
  state: {
    categories: []
  },
  getters: {
    categories(state) {
      return state.categories;
    }
  },
  mutations: {
    setCategories(state, payload) {
      state.categories = payload;
    },
    addCategory(state, payload) {
      state.categories.push(payload);
    },
    deleteCategory(state, id) {
      const index = state.categories.findIndex(category => category.id === id);
      if (index !== -1) {
        state.categories.splice(index, 1);
      }
    },
    updateCategory(state, payload) {
      const category = state.categories.find(
        category => category.id === payload.id
      );
      if (category) {
        Object.assign(category, payload);
      }
    }
  },
  actions: {
    async getCategories({ commit }) {
      try {
        const url = `${process.env.VUE_APP_BACKEND_ADDRESS}/api/categories`;
        const result = await fetch(url, {
          method: "GET"
        });
        if (result.status !== 200) {
          throw new Error('Сервер не смог вернуть категории');
        }
        const categories = await result.json();
        commit("setCategories", categories);
      } catch (e) {
        throw e;
      }

    },
    async addCategory({ commit }, payload) {
      try {
        const url = `${process.env.VUE_APP_BACKEND_ADDRESS}/api/categories`;
        const result = await fetch(url, {
          method: "POST",
          headers: new Headers({
            "Content-Type": "application/json"
          }),
          body: JSON.stringify(payload)
        });
        if (result.status !== 200) {
          throw new Error('Сервер не добавил категорию');
        }
        const id = await result.json();
        commit("addCategory", {
          ...payload,
          ...id
        });
      } catch (e) {
        throw e;
      }
    },
    async updateCategory({ commit }, payload) {
      try {
        const url = `${process.env.VUE_APP_BACKEND_ADDRESS}/api/categories/${
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
          throw new Error('Сервер не обновил категорию');
        }
        commit("updateCategory", payload);
      } catch (e) {
        throw e;
      }
    },
    async deleteCategory({ commit }, id) {
      try {
        const url = `${process.env.VUE_APP_BACKEND_ADDRESS}/api/categories/${id}`;
        const result = await fetch(url, {
          method: "DELETE"
        });
        if (result.status !== 200) {
          throw new Error('Сервер не удалил категорию');
        }
        commit("deleteCategory", id);
      } catch (e) {
        throw e;
      }
    }
  }
};
