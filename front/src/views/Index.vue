<template>
  <v-layout column fill-height style="position: relative">
    <v-flex>
      <app-transcode-info></app-transcode-info>
    </v-flex>
    <v-flex mt-5 mb-4 align-self-center shrink>
      <app-file-upload-button class="my-file-upload-btn"></app-file-upload-button>
    </v-flex>
  </v-layout>
</template>


<script>
import FileUploadButton from "../components/FileUploadButton";
import TranscodeInfo from "../components/TranscodeInfo";
export default {
  components: {
    appFileUploadButton: FileUploadButton,
    appTranscodeInfo: TranscodeInfo
  },
  data() {
    return {};
  },
  created() {
    this.$socket.emit("join", "FILEINFO", err => {
      if (err) {
        console.log("ERROR joining ", err);
      }
    });
  },
  beforeDestroy() {
    this.$socket.emit("leave", "FILEINFO", err => {
      if (err) {
        console.log("ERROR leaving ", err);
      }
    });
  }
};
</script>

<style scoped lang="scss">
.my-file-upload-btn {
  position: absolute;
  bottom: 0;

  right: 100px;
}
</style>


