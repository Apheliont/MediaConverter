<template>
  <div>
    <div class="text-center">
      <v-dialog
        v-model="dialog"
        persistent
        transition="scale-transition"
        class="title"
        max-width="1000"
      >
        <v-card>
          <div class="my-model-screen" v-if="editDialog" @click.stop.prevent></div>
          <v-scale-transition>
            <app-edit-dialog
              v-if="editDialog"
              :editfilename="editfilename"
              :files="files"
              @cancel="cancelEditDialog"
              @save="saveEditDialog"
            />
          </v-scale-transition>
          <v-card-title class="headline grey lighten-2" primary-title>Импорт файлов</v-card-title>
          <v-alert :value="successfulUpload" type="success">Ура! Закачалось!</v-alert>
          <v-alert
            :value="waitToUploadAlert"
            type="warning"
          >Пожалуйста не закрывайте это окно до завершения операции</v-alert>
          <v-card-text>
            <span :class="{'my-interaction-blocker': isUploading}"></span>
            <v-progress-linear slot="progress" color="blue" :value="uploadPercent"></v-progress-linear>
            <v-data-table
              :hide-headers="isUploading"
              hide-actions
              v-model="selected"
              :headers="headers"
              :items="files"
              class="elevation-2 my-data-table"
              item-key="index"
              disable-initial-sort
              select-all
            >
              <template slot="items" slot-scope="props">
                <td>
                  <v-checkbox v-model="props.selected" primary :disabled="isUploading" hide-details></v-checkbox>
                </td>
                <td @click="showEditDialog" class="my-name-cell">
                  <div class="my-name-field">{{ props.item.fileName }}</div>
                </td>
                <td>
                  <input
                    class="my-input-time"
                    solo
                    flat
                    hide-details
                    single-line
                    type="time"
                    step="1"
                    value="00:00:00"
                    @input="props.item.startTime = timeFormat($event.target.value)"
                  >
                </td>
                <td>
                  <input
                    class="my-input-time"
                    solo
                    flat
                    hide-details
                    single-line
                    type="time"
                    step="1"
                    error
                    value="00:00:00"
                    @input="props.item.endTime = timeFormat($event.target.value)"
                  >
                </td>
                <td class="text-right">{{ props.item.size | humanReadableSize }}</td>
              </template>
            </v-data-table>
          </v-card-text>
          <v-card-actions>
            <v-select
              item-text="name"
              item-value="id"
              :items="categories"
              :error="!category"
              label="Категория"
              v-model="category"
              hide-details
              :disabled="isUploading"
            ></v-select>
            <v-spacer></v-spacer>
            <v-btn color="error" left @click="closeUploadWindow">Отмена</v-btn>
            <v-btn color="warning" :disabled="!selected.length" left @click="remove">Удалить</v-btn>
            <v-btn
              color="success"
              :disabled="!allowSubmit"
              left
              @click="submitUploading"
            >Импортировать</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </div>
  </div>
</template>

<script>
import EditDialog from "./EditDialog";
import { mapGetters } from "vuex";
import { mapActions } from "vuex";
import { mapMutations } from "vuex";
export default {
  props: ["rawFiles"],
  components: {
    appEditDialog: EditDialog
  },
  data() {
    return {
      dialog: false,
      startCodingTime: "00:00:00",
      endCodingTime: "00:00:00",
      editDialog: false,
      editfilename: "",
      successfulUpload: false,
      waitToUploadAlert: false,
      category: "",
      isUploading: false,
      selected: [],
      headers: [
        {
          text: "Имя файла",
          value: "fileName"
        },
        {
          text: "Кодировать с",
          value: "startTime",
          sortable: false,
          width: 120
        },
        { text: "по", value: "endTime", sortable: false, width: 120 },
        { text: "Размер", value: "size" }
      ],
      files: []
    };
  },
  computed: {
    ...mapGetters({
      uploadPercent: "files/uploadPercent",
      categories: "categories/categories",
      allowedExtension: "files/allowedExtension"
    }),
    allowSubmit() {
      return !this.isUploading && this.category && this.files.length > 0;
    }
  },
  watch: {
    // неоптимальное решение, но поле category не принимает значения
    // при первом выборе в поле селект. Решений кроме вотча не найдено
    category(category) {
      this.files.forEach(file => {
        file.category = category;
      });
    },
    uploadPercent(value) {
      if (value >= 100) {
        this.waitToUploadAlert = false;
        this.successfulUpload = true;
        setTimeout(() => {
          this.dialog = false;
          setTimeout(() => {
            this.$emit("closeDialog");
          }, 1000);
        }, 1500);
      }
    }
  },
  methods: {
    ...mapActions({
      uploadFiles: "files/uploadFiles",
      cancelUpload: "files/cancelUpload"
    }),
    ...mapMutations({
      setUploadPercent: "files/setUploadPercent"
    }),

    timeFormat(value) {
      if (value.length < 8) {
        return `${value}:00`;
      } else {
        return value;
      }
    },
    showEditDialog(event) {
      this.editfilename = event.target.textContent;
      this.editDialog = true;
    },
    cancelEditDialog() {
      this.editfilename = "";
      this.editDialog = false;
    },
    saveEditDialog(obj) {
      const file = this.files.find(
        file => file.fileName === obj.originalFileName
      );
      if (file) {
        file.fileName = obj.changedFileName;
      }
      this.editfilename = "";
      this.editDialog = false;
    },
    // Трансформирует файлы пришетшие из родительского компонента, добавляя доп инфу
    transformFiles(rawFiles) {
      const allowedExtension = this.allowedExtension;

      // функция трансформации данных, с чейном методов
      function transform(fls) {
        let files = Array.from(fls);
        return {
          // возвращает массив вложенных массивов [file, name, extension]
          splitExtension() {
            files = files.map(file => {
              const name = file.name;
              const indexOfDot = name.lastIndexOf(".");
              if (indexOfDot !== -1) {
                return [
                  file,
                  name.slice(0, indexOfDot),
                  name.slice(indexOfDot).toLowerCase()
                ];
              }
              return [file, name, ""];
            });
            return this;
          },
          // filter based on extensions
          filterBasedOnExtension() {
            files = files.filter(file => {
              return allowedExtension.includes(file[2]);
            });
            return this;
          },
          // transform, returns additional info such as name, size, extension
          addInfo() {
            if (files.length === 0) {
              files = [];
              return this;
            }
            files = files.map((file, index) => {
              return {
                file: file[0],
                fileName: file[1],
                size: file[0].size,
                extension: file[2],
                startTime: "00:00:00",
                endTime: "00:00:00",
                index
              };
            });
            return this;
          },

          getFiles() {
            return files;
          }
        };
      }

      return transform(rawFiles)
        .splitExtension()
        .filterBasedOnExtension()
        .addInfo()
        .getFiles();
    },
    submitUploading() {
      this.isUploading = true;
      this.waitToUploadAlert = true;
      this.uploadFiles(this.files);
      window.addEventListener("beforeunload", this.warnUserBeforeLeave);
      this.saveCategory();
    },
    closeUploadWindow() {
      if (this.isUploading) {
        if (confirm("Отменить загрузку файлов?")) {
          this.cancelUpload(this.files);
        } else {
          return;
        }
      }
      // хак чтобы оставить анимацию
      this.dialog = false;
      setTimeout(() => {
        this.$emit("closeDialog");
      }, 1000);
    },
    warnUserBeforeLeave(event) {
      event.preventDefault();
      // Chrome requires returnValue to be set.
      event.returnValue = "";
      return "В данный момент идет закачка файлов. Хотите прервать процесс?";
    },
    remove() {
      let copyArrayFiles = Array.from(this.files);
      let indexToDelete = null;

      for (let file of this.selected) {
        indexToDelete = copyArrayFiles.indexOf(file);
        copyArrayFiles.splice(indexToDelete, 1);
      }
      if (copyArrayFiles.length === 0) {
        this.closeUploadWindow();
      } else {
        this.files = copyArrayFiles;
        this.selected = [];
      }
    },
    escListener(e) {
      if (e.keyCode === 27 && !this.editDialog) {
        this.closeUploadWindow();
      }
      if (e.keyCode === 27 && this.editDialog) {
        this.cancelEditDialog();
      }
      if (e.keyCode === 13 && !this.editDialog && this.allowSubmit) {
        this.submitUploading();
      }
    },
    saveCategory() {
      window.localStorage.setItem("category_id", this.category);
    }
  },
  created() {
    // достаем из кэша браузера данные о категории
    const categoryId = +window.localStorage.getItem("category_id");
    const foundCategoryIndex = this.categories.findIndex(
      category => category.id === categoryId
    );
    if (foundCategoryIndex !== -1) {
      this.category = categoryId;
    }

    window.addEventListener("keydown", this.escListener);
    this.files = this.transformFiles(this.rawFiles);
  },
  mounted() {
    // хак на хук для анимации =)
    this.dialog = true;
  },
  beforeDestroy() {
    this.setUploadPercent(0);
    window.removeEventListener("keydown", this.escListener);
    window.removeEventListener("beforeunload", this.warnUserBeforeLeave);
  }
};
</script>

<style scoped>
.my-name-field {
  width: 400px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: bold;
}

.my-name-cell:hover {
  cursor: pointer;
}

.my-data-table {
  max-height: 350px;
  overflow-y: scroll;
  overflow-x: hide;
}

.my-edit-dialog {
  position: absolute;
  top: 10px;
  left: 0px;
  right: 0px;
  bottom: 20px;
  width: 550px;
  height: 160px;
  z-index: 999;
  background-color: #fff;
}

.my-interaction-blocker {
  position: absolute;
  top: 0;
  bottom: 60px;
  left: 0;
  right: 0;
  z-index: 9999;
}

.my-input-time {
  outline: none;
}

.my-input-time::-webkit-outer-spin-button,
.my-input-time::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.my-input-time::-webkit-clear-button {
  display: none;
  -webkit-appearance: none;
  width: 0;
  height: 0;
}

.my-model-screen {
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 990;
  background: rgba(0, 0, 0, 0.2);
}
</style>

