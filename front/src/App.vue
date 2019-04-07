<template>
  <v-app class="app-container">
    <v-container
      fill-height
      fluid
      class="app-wrapper"
      @drop.prevent.stop="onDrop"
      @dragover.prevent.stop="onDragOver"
      @dragenter.prevent.stop="onDragEnter"
      @dragleave.prevent.stop="onDragLeave"
    >
      <v-layout column>
        <v-flex shrink>
          <app-header></app-header>
        </v-flex>
        <v-flex>
          <v-slide-x-transition mode="out-in">
            <router-view></router-view>
          </v-slide-x-transition>
        </v-flex>
        <v-flex shrink>
          <app-footer></app-footer>
        </v-flex>
      </v-layout>
    </v-container>
  </v-app>
</template>

<script>
import Header from "./components/Header";
import Footer from "./components/Footer";

export default {
  components: {
    appHeader: Header,
    appFooter: Footer
  },
  name: "Converter",
  data() {
    return {
      //
    };
  },
  methods: {
    onDragEnter() {},
    onDragLeave() {},
    onDragOver() {},
    onDrop() {}
  }
};
</script>
<style lang="scss">
@import "./styles/index.scss";
</style>

<style scoped lang="scss">
@import "./styles/variables.scss";
.app-container {
  background: url(#{$backend}/images/bg.jpg) #f7f7e0 !important;
  background-repeat: no-repeat;
  background-attachment: fixed;
  background-position: center;
  background-size: contain;
}
.app-wrapper {
  margin: 0;
  padding: 0;
  background-color: rgba(241, 245, 194, 0.7);
}
</style>

