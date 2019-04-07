import Vue from 'vue'
import './plugins/vuetify'
import App from './App.vue'
import router from './router'
import store from './store/store'
import VueSocketIO from 'vue-socket.io'
import './filters'
import './registerServiceWorker'

Vue.use(
  new VueSocketIO({
    debug: false,
    connection: process.env.VUE_APP_BACKEND_ADDRESS,
    vuex: {
      store,
      actionPrefix: "SOCKET_",
      mutationPrefix: "SOCKET_"
    }
  })
);

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app')
