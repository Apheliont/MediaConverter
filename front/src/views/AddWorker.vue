<template>
  <v-layout row nowrap justify-center>
    <v-flex shrink>
      <v-card min-width="430">
        <v-card-title>Добавление обработчика:</v-card-title>
        <v-card-text>
          <v-form ref="form" v-model="valid">
            <v-text-field
              v-model="worker.name"
              @input="dataChanged"
              :rules="nameRules"
              label="Название"
              required
            ></v-text-field>
            <v-text-field
              v-model="worker.host"
              @input="dataChanged"
              :rules="hostRules"
              label="Адрес"
              required
            ></v-text-field>
            <v-text-field
              v-model.number="worker.port"
              @input="dataChanged"
              :rules="portRules"
              label="Порт"
              required
            ></v-text-field>
            <v-text-field
              v-model="worker.sourcePath"
              @input="dataChanged"
              label="Путь до файлов закачанных через Web"
              :rules="pathRules"
              required
            ></v-text-field>
            <v-switch
              :label="`Автоконнект: ${worker.autoConnect ? 'Да' : 'Нет'}`"
              v-model="worker.autoConnect"
              @change="dataChanged"
            ></v-switch>
            <v-textarea
              v-model="worker.description"
              @input="dataChanged"
              name="description"
              label="Описание"
              hint="Опциональное описание"
            ></v-textarea>
            <v-layout row nowrap justify-end>
              <v-flex shrink>
                <v-btn :disabled="!hasChanged" right color="error" @click="reset">Сбросить</v-btn>
                <v-btn :disabled="!valid" color="success" @click="submit">Добавить</v-btn>
              </v-flex>
            </v-layout>
          </v-form>
        </v-card-text>
      </v-card>
    </v-flex>
  </v-layout>
</template>

<script>
import { mapActions } from "vuex";
export default {
  data: () => ({
    hasChanged: false,
    worker: {
      name: "",
      host: "",
      port: "",
      sourcePath: "",
      autoConnect: false,
      description: ""
    },
    valid: true,
    pathRules: [v => !!v || "Укажите папку"],
    hostRules: [v => !!v || "Укажите хост"],
    nameRules: [v => !!v || "Укажите имя"],
    portRules: [
      v => !!v || "Укажите порт",
      v => (Number.isInteger(v) && v > 0) || "Должны быть цифры",
      v => v < 65536 || "Не может превышать 65535"
    ]
  }),
  methods: {
    ...mapActions({
      addWorker: "workers/addWorker"
    }),
    dataChanged() {
      this.hasChanged = true;
    },
    submit() {
      this.addWorker(this.worker).then(data => {
        this.$router.push({
          name: "editWorker",
          params: { id: data.id, worker: data }
        });
      });
    },
    reset() {
      this.$refs.form.reset();
      this.hasChanged = false;
    }
  }
};
</script>



