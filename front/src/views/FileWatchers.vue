<template>
  <v-flex align-self-start>
    <v-card fill-height>
      <v-card-title class="my-title">
        Наблюдатели:
        <v-spacer></v-spacer>
        <v-dialog v-model="dialog" max-width="500px" persistent>
          <v-btn slot="activator" color="primary" dark class="mb-2">Добавить наблюдателя</v-btn>
          <v-card>
            <v-card-title>
              <span class="headline">{{ formTitle }}</span>
            </v-card-title>
            <v-card-text>
              <v-form v-model="valid">
                <v-container grid-list-md>
                  <v-layout column>
                    <v-flex xs12 sm6 md4>
                      <v-text-field
                        v-model="editedWatcher.host"
                        @input="hasChanged = true"
                        :rules="hostRule"
                        label="Адрес хоста"
                        clearable
                      ></v-text-field>
                    </v-flex>
                    <v-flex xs12 sm6 md4>
                      <v-text-field
                        v-model="editedWatcher.port"
                        @input="hasChanged = true"
                        :rules="portRule"
                        label="Порт хоста"
                      ></v-text-field>
                    </v-flex>
                  </v-layout>
                </v-container>
              </v-form>
            </v-card-text>
            <v-card-actions>
              <v-spacer></v-spacer>
              <v-btn color="error" @click="close">Отмена</v-btn>
              <v-btn color="success" :disabled="!valid || !hasChanged" @click="save">Сохранить</v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>
      </v-card-title>
      <v-card-text>
        <v-data-table
          :headers="headers"
          :items="watchers"
          hide-actions
          class="elevation-2 my-data-table"
          item-key="props.item.id"
          disable-initial-sort
        >
          <template slot="items" slot-scope="props">
            <td class="text-xs-left">
              <v-icon v-if="props.item.status === 1" color="green accent-4">link</v-icon>
              <v-icon v-else>link_off</v-icon>
            </td>
            <td class="text-xs-left">{{ props.item.host }}</td>
            <td class="text-xs-left">{{ props.item.port }}</td>
            <td class="text-xs-left">
              <v-icon class="mr-2" @click="edit(props.item)">edit</v-icon>
              <v-icon v-if="props.item.status === 0" class="mr-2" @click="switchWatcher(props.item.id)">play_arrow</v-icon>
              <v-icon v-else class="mr-2" @click="switchWatcher(props.item.id)">pause</v-icon>
              <v-icon @click="remove(props.item)">delete</v-icon>
            </td>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>
  </v-flex>
</template>

<script>
import { mapGetters } from "vuex";
import { mapActions } from "vuex";
export default {
  data() {
    return {
      dialog: false,
      hasChanged: false,
      valid: false,
      headers: [
        {
          text: "Состояние",
          align: "left",
          value: "host",
          width: 150
        },
        {
          text: "Адрес хоста",
          align: "left",
          value: "host"
        },
        {
          text: "Порт хоста",
          align: "left",
          value: "port",
          width: 150
        },
        { text: "Действия", value: "path", align: "left", sortable: false, width: 150 }
      ],
      editedIndex: -1,
      editedWatcher: {
        id: "",
        host: "",
        port: ""
      },
      defaultWatcher: {
        id: "",
        host: "",
        port: ""
      },
      hostRule: [v => (v && v.length > 0) || "Поле не может быть пустым"],
      portRule: [
        v => (!!v) || "Поле не может быть пустым",
        v =>
          (Number.isInteger(+v) && Number.isFinite(+v) && +v > 0) ||
          "Поле должно содержать только цифры",
        v => +v < 65536 || "Порт не может превышать число 65535"
      ]
    };
  },
  computed: {
    ...mapGetters({
      watchers: "watchers/watchers"
    }),
    formTitle() {
      return this.editedIndex === -1
        ? "Добавление наблюдателя"
        : "Редактирование";
    }
  },
  watch: {
    dialog(val) {
      val || this.close();
    }
  },

  methods: {
    ...mapActions("watchers", [
      "addWatcher",
      "updateWatcher",
      "deleteWatcher",
      "switchWatcher"
    ]),
    edit(watcher) {
      this.editedIndex = this.watchers.indexOf(watcher);
      this.editedWatcher = Object.assign(
        {},
        { id: watcher.id, host: watcher.host, port: watcher.port }
      );
      this.dialog = true;
    },

    remove(watcher) {
      confirm("Вы уверены что хотите удалить наблюдатель?") &&
        this.deleteWatcher(watcher.id);
    },

    close() {
      this.dialog = false;
      this.hasChanged = false;
      setTimeout(() => {
        this.editedWatcher = Object.assign({}, this.defaultWatcher);
        this.editedIndex = -1;
      }, 300);
    },

    save() {
      if (this.editedIndex > -1) {
        this.updateWatcher(this.editedWatcher);
      } else {
        this.addWatcher(this.editedWatcher);
      }
      this.close();
    }
  },
  created() {
    this.$socket.emit("join", "WATCHERINFO", err => {
      if (err) {
        console.log("ERROR joining ", err);
      }
    });
  },
  beforeDestroy() {
    this.$socket.emit("leave", "WATCHERINFO", err => {
      if (err) {
        console.log("ERROR leaving ", err);
      }
    });
  }
};
</script>

<style scoped>
.my-data-table {
  margin-top: -4px;
  max-height: 500px;
  min-height: 500px;
  overflow-y: scroll;
  padding-bottom: 20px;
}

.my-title {
  background-color: #ececec;
  padding: 10px 20px;
}
</style>


