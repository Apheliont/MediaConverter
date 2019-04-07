import Vue from "vue";
import Vuex from "vuex";
import categories from "./modules/categories";
import workers from "./modules/workers";
import files from "./modules/files";
import logs from "./modules/logs";
import settings from "./modules/settings";

Vue.use(Vuex);

export default new Vuex.Store({
  modules: {
    categories,
    workers,
    files,
    logs,
    settings
  }
});
