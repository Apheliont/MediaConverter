<template>
  <v-layout column fill-height>
    <v-flex shrink>
      <v-form v-model="valid">
        <v-layout row nowrap>
          <v-flex xs6>
            <v-card>
              <v-card-title>База данных:</v-card-title>
              <v-card-text>
                <v-container>
                  <v-layout column>
                    <v-flex>
                      <v-text-field
                        v-model="tempSettings.database.host"
                        @input="hasChanged = true"
                        :disabled="!isEditing"
                        :rules="[notEmpty]"
                        label="Адрес сервера базы данных"
                      ></v-text-field>
                    </v-flex>
                    <v-flex>
                      <v-text-field
                        v-model="tempSettings.database.database"
                        @input="hasChanged = true"
                        :disabled="!isEditing"
                        :rules="[notEmpty]"
                        label="Имя базы данных"
                      ></v-text-field>
                    </v-flex>
                    <v-flex>
                      <v-text-field
                        v-model="tempSettings.database.user"
                        @input="hasChanged = true"
                        :disabled="!isEditing"
                        :rules="[notEmpty]"
                        label="Пользователь"
                      ></v-text-field>
                    </v-flex>
                    <v-flex>
                      <v-text-field
                        v-model="tempSettings.database.password"
                        @input="hasChanged = true"
                        :disabled="!isEditing"
                        :rules="[notEmpty]"
                        label="Пароль"
                      ></v-text-field>
                    </v-flex>
                  </v-layout>
                </v-container>
              </v-card-text>
            </v-card>
          </v-flex>
          <v-flex xs6 ml-4>
            <v-card elevation-0 min-height="100%">
              <v-card-title>Настройки сервера:</v-card-title>
              <v-card-text>
                <v-container>
                  <v-layout column>
                    <v-flex>
                      <v-text-field
                        v-model="tempSettings.uploadPath"
                        @input="hasChanged = true"
                        :disabled="!isEditing"
                        :rules="[notEmpty]"
                        label="Путь для закачки файлов через WEB"
                      ></v-text-field>
                    </v-flex>
                    <v-flex>
                      <v-text-field
                        v-model="tempSettings.tempFolderName"
                        @input="hasChanged = true"
                        :disabled="!isEditing"
                        :rules="[notEmpty]"
                        label="Название для временной папки"
                      ></v-text-field>
                    </v-flex>
                  </v-layout>
                </v-container>
              </v-card-text>
            </v-card>
          </v-flex>
        </v-layout>
      </v-form>
    </v-flex>
    <v-flex mt-5 align-self-end>
      <v-flex align-self-end v-if="!isEditing">
        <v-btn color="info" @click="isEditing = true">Редактировать</v-btn>
      </v-flex>
      <v-flex align-self-end v-else>
        <v-btn right color="error" @click="reset">Отменить</v-btn>
        <v-btn :disabled="!valid || !hasChanged" color="success" @click="save">Сохранить</v-btn>
      </v-flex>
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
  data: () => ({
    snackbar: false,
    isEditing: false,
    valid: false,
    snackText: "Сохранено",
    snackColor: "success",
    tempSettings: {
      uploadPath: "",
      tempFolderName: "",
      database: {
        database: "",
        host: "",
        user: "",
        password: ""
      }
    },
    forReset: {
      uploadPath: "",
      tempFolderName: "",
      database: {
        database: "",
        host: "",
        user: "",
        password: ""
      }
    },
    isValid: false,
    hasChanged: false,
    notEmpty: v => {
      return (v && v.length > 0) || "Поле не может быть пустым!";
    }
  }),
  computed: {
    ...mapGetters({
      settings: "settings/settings"
    })
  },
  methods: {
    ...mapActions({
      pushSettings: "settings/pushSettings",
      pullSettings: "settings/pullSettings"
    }),
    createDataCopy() {
      const sheerCopy = JSON.parse(JSON.stringify(this.settings));
      this.tempSettings = Object.assign({}, this.tempSettings, sheerCopy);
    },
    uploadPath(event) {
      this.tempSettings.uploadPath = event;
    },
    async save() {
      try {
        await this.pushSettings(this.tempSettings);
        this.snackColor = "success";
        this.snackText = "Сохранено";
        this.snackbar = true;
        this.createDataCopy();
        this.hasChanged = false;
        this.isEditing = false;
      } catch (e) {
        this.snackColor = "error";
        this.snackText = e.message;
        this.snackbar = true;
      }
    },
    reset() {
      const sheerCopy = JSON.parse(JSON.stringify(this.settings));
      this.tempSettings = Object.assign({}, this.forReset, sheerCopy);
      this.hasChanged = false;
      this.isEditing = false;
    }
  },
  created() {
    this.createDataCopy();
  }
};
</script>



