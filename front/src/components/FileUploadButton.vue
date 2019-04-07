<template>
  <div>
    <v-hover>
      <v-btn
        @drop.prevent.stop="onDrop"
        @dragover.prevent.stop="onDragOver"
        @dragenter.prevent.stop="onDragEnter"
        @dragleave.prevent.stop="onDragLeave"
        @click="onClick"
        ripple
        flat
        tag="div"
        class="mx-auto my-file-uploader"
        slot-scope="{ hover }"
        :class="`elevation-${hover ? 12 : 4}`"
      >Пожалуйста положите файлы сюда</v-btn>
    </v-hover>

    <app-file-upload-dialog v-if="dialog" :rawFiles="files" @closeDialog="dialog = false"></app-file-upload-dialog>
  </div>
</template>

<script>
import FileUploadDialog from "./FileUploadDialog";
export default {
  components: {
    appFileUploadDialog: FileUploadDialog
  },
  data() {
    return {
      dialog: false,
      files: []
    };
  },

  methods: {
    onDragEnter() {},
    onDragLeave() {},
    onDragOver() {},
    onClick(e) {
      function openFileDialog(callback) {
        var inputElement = document.createElement("input");
        inputElement.type = "file";
        inputElement.setAttribute("multiple", "multiple");

        inputElement.addEventListener("change", callback, e);
        // dispatch a click event to open the file dialog
        inputElement.dispatchEvent(new MouseEvent("click"));
      }
      const helper = e => {
        // Фикс для фаерфокса
        const files = e.path ? e.path[0].files : e.originalTarget.files;
        this.onDrop({
          dataTransfer: {
            files
          }
        });
      };
      openFileDialog(helper);
    },
    onDrop(e) {
      const dt = e.dataTransfer;
      this.files = dt.files;
      this.dialog = true;
    }
  }
};
</script>

<style scoped>
.my-file-uploader {
  height: 150px;
  border-radius: 10px;
  background-color: #d14334;
  font-size: 24px;
}
</style>

