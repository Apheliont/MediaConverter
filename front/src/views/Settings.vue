<template>
  <v-layout row nowrap fill-height>
    <v-flex shrink class="my-drawer" elevation-2>
      <app-drawer></app-drawer>
    </v-flex>
    <v-flex grow mx-3>
      <v-container fill-height elevation-2>
      <v-slide-x-transition mode="out-in">
        <router-view></router-view>
      </v-slide-x-transition>
      </v-container>
    </v-flex>
  </v-layout>
</template>

<script>
import Drawer from "../components/Drawer";
export default {
  components: {
    appDrawer: Drawer
  },
  data() {
    return {};
  },

  created() {
    this.$socket.emit('join', 'WORKERINFO', err => {
      if (err) {
        console.log('ERROR joining ', err);
      }
    })
  },
  beforeDestroy() {
    this.$socket.emit('leave', 'WORKERINFO', err => {
      if (err) {
        console.log('ERROR leaving ', err);
      }
    })
  }
};
</script>

<style scoped>
.my-drawer {
  background-color: rgba(255, 255, 255, 0.8) !important;
  width: 300px !important;
  border-radius: 0 10px 10px 0;
}

</style>

