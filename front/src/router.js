import Vue from 'vue'
import Router from 'vue-router'

Vue.use(Router)

import Index from './views/Index';
import Settings from './views/Settings';
import Logs from './views/Logs';
import General from './views/General';
import Categories from './views/Categories';
import AddWorker from './views/AddWorker';
import EditWorker from './views/EditWorker';

// const Index = () => import('./views/Index');
// const Settings = () => import('./views/Settings');
// const Logs = () => import('./views/Logs');
// const General = () => import('./views/General');
// const Categories = () => import('./views/Categories');
// const AddWorker = () => import('./views/AddWorker');
// const EditWorker = () => import('./views/EditWorker');

import store from './store/store';

export default new Router({
  mode: "history",
  base: process.env.BASE_URL,
  routes: [
    {
      path: "",
      name: "home",
      component: Index,
      beforeEnter: (to, from, next) => {
        Promise.all([
          store.dispatch('files/getFiles'),
          store.dispatch('categories/getCategories')
        ]).then(() => {
          next();
        });
      }
    },
    {
      path: "/settings",
      name: "settings",
      component: Settings,
      beforeEnter: (to, from, next) => {
        store.dispatch('workers/getWorkers')
          .then(() => {
            next();
          })
      },
      children: [
        {
          path: "general",
          name: "general",
          component: General,
          beforeEnter: (to, from, next) => {
            store.dispatch("settings/pullSettings").then(() => {
              next();
            });
          }
        },
        {
          path: "categories",
          name: "categories",
          component: Categories,
          beforeEnter: (to, from, next) => {
            store.dispatch('categories/getCategories')
              .then(() => {
                next();
              });
          }
        },
        {
          path: "workers",
          name: "addWorker",
          component: AddWorker
        },
        {
          path: "workers/:id",
          name: "editWorker",
          component: EditWorker,
          props: (route) => {
            return { id: Number.parseInt(route.params.id) }
          }
        }
      ]
    },
    {
      path: "/logs",
      name: "logs",
      component: Logs,
      beforeEnter: (to, from, next) => {
        Promise.all([
          store.dispatch('logs/getLogs'),
          store.dispatch('categories/getCategories')
        ])
          .then(() => {
            next();
          })
      }
    },
    {
      path: "*",
      redirect: ""
    }
  ]
});
