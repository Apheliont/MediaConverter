<template>
  <v-layout row nowrap justify-center>
    <v-flex shrink mr-3>
      <v-card max-width="430" min-width="430">
        <v-card-title>Редактирование обработчика:</v-card-title>
        <v-card-text>
          <v-form ref="form" v-model="valid">
            <v-text-field
              :disabled="!isEditing"
              v-model="tempWorker.name"
              @input="dataChanged"
              :rules="nameRules"
              label="Название"
              required
            ></v-text-field>
            <v-text-field
              :disabled="!isEditing"
              v-model="tempWorker.host"
              @input="dataChanged"
              :rules="hostRules"
              label="Адрес хоста"
              required
            ></v-text-field>
            <v-text-field
              :disabled="!isEditing"
              v-model.number="tempWorker.port"
              @input="dataChanged"
              :rules="portRules"
              label="Порт хоста"
              required
            ></v-text-field>
            <v-text-field
              :disabled="!isEditing"
              v-model="tempWorker.sourceFolder"
              @input="dataChanged"
              :rules="tempFolderRules"
              label="Папка с исходниками"
              required
            ></v-text-field>
            <v-text-field
              :disabled="!isEditing"
              v-model="tempWorker.tempFolder"
              @input="dataChanged"
              :rules="tempFolderRules"
              label="Папка для временных файлов"
              required
            ></v-text-field>
            <v-switch
              :disabled="!isEditing"
              v-model="tempWorker.autoConnect"
              @change="dataChanged"
              :label="`Автоконнект: ${tempWorker.autoConnect ? 'Да' : 'Нет'}`"
            ></v-switch>
            <v-textarea
              :disabled="!isEditing"
              v-model="tempWorker.description"
              @input="dataChanged"
              label="Описание"
              hint="Опциональное описание"
            ></v-textarea>
            <v-layout row nowrap justify-end>
              <v-flex shrink v-if="!isEditing" align-self-end>
                <v-btn color="error" @click="remove">Удалить</v-btn>
                <v-btn
                  color="warning"
                  :disabled="turnOnOffButton"
                  @click="turnOnOff"
                >{{ connectionState }}</v-btn>
                <v-btn color="info" @click="isEditing = true">Изменить</v-btn>
              </v-flex>
              <v-flex shrink align-self-end v-else>
                <v-btn right color="error" @click="reset">Отменить</v-btn>
                <v-btn :disabled="!valid || !hasChanged" color="success" @click="save">Сохранить</v-btn>
              </v-flex>
            </v-layout>
          </v-form>
        </v-card-text>
      </v-card>
    </v-flex>
    <v-flex shrink>
      <v-card>
        <v-card-title>Инфо:</v-card-title>
        <v-card-text>
          <v-text-field readonly outline label="Id" :value="id ? id : '-'"></v-text-field>
          <v-text-field readonly outline label="В работе" :value="isBusy"></v-text-field>
          <v-text-field readonly outline label="Состояние" :value="connectionMessage"></v-text-field>
        </v-card-text>
      </v-card>
    </v-flex>
    <v-snackbar v-model="snackbar" top :timeout="2000" :color="snackColor">
      {{ snackText }}
      <v-btn flat @click="snackbar = false">Закрыть</v-btn>
    </v-snackbar>
  </v-layout>
</template>

<script>
import { mapGetters, mapActions } from "vuex";
export default {
  props: {
    id: Number
  },
  data() {
    return {
      hasChanged: false,
      snackbar: false,
      snackColor: "",
      snackText: "",
      isEditing: false,
      turnOnOffButton: false,
      tempWorker: {
        name: "",
        host: "",
        port: "",
        sourceFolder: "",
        tempFolder: "",
        autoConnect: true,
        description: ""
      },
      valid: true,
      tempFolderRules: [v => !!v || "Укажите папку"],
      hostRules: [v => !!v || "Укажите хост"],
      nameRules: [v => !!v || "Укажите имя"],
      portRules: [
        v => !!v || "Укажите порт",
        v => (Number.isInteger(v) && v > 0) || "Должны быть цифры",
        v => v < 65536 || "Не может превышать 65535"
      ]
    };
  },
  computed: {
    ...mapGetters({
      workers: "workers/workers"
    }),
    worker() {
      return this.workers.find(worker => worker.id === this.id);
    },
    connectionState() {
      const status = this.worker.condition.status;
      if (status === 0) {
        return "подключить";
      }
      if (status === 1) {
        return "отключить";
      }
      return 'ошибка';
    },
    connectionStatus() {
      return this.worker.condition.status;
    },
    connectionMessage() {
      switch (this.worker.condition.message) {
        case "transport close":
          return "Разрыв связи";
        case "io client disconnect":
          return "Отключён";
        default:
          return this.worker.condition.message;
      }
    },
    isBusy() {
      return this.worker.condition.isBusy ? "Да" : "Нет";
    }
  },
  watch: {
    worker() {
      this.turnOnOffButton = false;
      this.initForm();
    },
    connectionStatus(val) {
      if (this.turnOnOffButton) {
        this.snackText =
          val === 0 ? "Обработчик отключён" : "Обработчик подключён";
        this.snackColor = "warning";
        this.snackbar = true;
        this.turnOnOffButton = false;
      }
    }
  },
  methods: {
    ...mapActions({
      deleteWorker: "workers/deleteWorker",
      updateWorker: "workers/updateWorker",
      switchWorker: "workers/switchWorker"
    }),
    dataChanged() {
      this.hasChanged = true;
    },
    initForm() {
      const props = {};
      props.name = this.worker.name;
      props.host = this.worker.host;
      props.port = this.worker.port;
      props.tempFolder = this.worker.tempFolder;
      props.sourceFolder = this.worker.sourceFolder;
      props.autoConnect = this.worker.autoConnect;
      props.description = this.worker.description;

      this.tempWorker = Object.assign({}, this.tempWorker, props);
    },
    remove() {
      confirm("Вы уверены что хотите удалить обработчик?") &&
        this.deleteWorker(this.id).then(() => {
          this.$router.replace({ name: "general" });
        });
    },
    turnOnOff() {
      if (
        confirm(`Вы уверены что хотите ${this.connectionState} обработчик?`)
      ) {
        this.turnOnOffButton = true;
        this.switchWorker(this.worker.id).catch(e => {
          this.snackText = `Что-то пошло не так ${e}`;
          this.snackColor = "error";
          this.snackbar = true;
        });
      }
    },
    reset() {
      this.initForm();
      this.isEditing = false;
      this.hasChanged = false;
    },
    async save() {
      try {
        const editedWorker = Object.assign({}, this.tempWorker);
        editedWorker.id = this.id;
        this.updateWorker(editedWorker);
        this.isEditing = false;
        this.hasChanged = false;

        this.snackText = "Изменения сохранены";
        this.snackColor = "success";
        this.snackbar = true;
      } catch (e) {
        this.snackText = `Ошибка сохранения ${e.message}`;
        this.snackColor = "error";
        this.snackbar = true;
      }
    }
  },
  created() {
    this.initForm();
  },
  beforeRouteUpdate(to, from, next) {
    if (this.isEditing) {
      if (this.hasChanged) {
        if (confirm("У вас есть несохраненные изменения! Продолжить без сохранения?")) {
          this.reset();
          next();
        }
      } else {
        this.reset();
        next();
      }
    } else {
      next();
    }
  }
};
</script>


