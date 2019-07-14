import Vue from "vue";
import Vuex from "vuex";
import categories from "./modules/categories";
import fwpaths from "./modules/fwpaths";
import workers from "./modules/workers";
import watchers from "./modules/watchers";
import files from "./modules/files";
import logs from "./modules/logs";
import settings from "./modules/settings";

Vue.use(Vuex);

export default new Vuex.Store({
  modules: {
    categories,
    fwpaths,
    workers,
    watchers,
    files,
    logs,
    settings
  }
});
