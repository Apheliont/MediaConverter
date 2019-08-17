<template>
  <v-flex align-self-start>
    <v-card fill-height>
      <v-card-title class="my-title">
        Наблюдатели:
        <v-spacer></v-spacer>
        <v-dialog v-model="dialog" max-width="500px" persistent>
          <v-btn slot="activator" color="#ce4b6d" dark class="mb-2">Добавить наблюдателя</v-btn>
          <v-card>
            <v-card-title>
              <span class="headline">{{ formTitle }}</span>
            </v-card-title>
            <v-card-text>
              <v-form v-model="valid">
                <v-container grid-list-md>
                  <v-layout column>
                    <v-flex xs12 sm6 md4>
                      <v-tooltip right v-model="tooltipHost" color="white">
                        <template v-slot:activator="{ on }">
                          <span>
                            <v-text-field
                              append-outer-icon="help_outline"
                              @click:append-outer="tooltipHost = !tooltipHost"
                              v-model="editedWatcher.host"
                              @input="hasChanged = true"
                              :rules="hostRule"
                              label="Адрес хоста"
                              clearable
                            ></v-text-field>
                          </span>
                        </template>
                        <span>FQDN или IP адрес</span>
                      </v-tooltip>
                    </v-flex>
                    <v-flex xs12 sm6 md4>
                      <v-tooltip right v-model="tooltipPort" color="white">
                        <template v-slot:activator="{ on }">
                          <span>
                            <v-text-field
                              append-outer-icon="help_outline"
                              @click:append-outer="tooltipPort = !tooltipPort"
                              v-model="editedWatcher.port"
                              @input="hasChanged = true"
                              :rules="portRule"
                              label="Порт хоста"
                            ></v-text-field>
                          </span>
                        </template>
                        <span>По умолчанию 3002. Можно настроить в файле .env модуля наблюдателя</span>
                      </v-tooltip>
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
          ref="fwatchers-data-table"
          no-data-text
          :headers="headers"
          :items="watchers"
          hide-actions
          class="my-data-table"
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
              <v-icon
                v-if="props.item.status === 0"
                class="mr-2"
                @click="switchWatcher(props.item.id)"
              >play_arrow</v-icon>
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
      tooltipHost: false,
      tooltipPort: false,
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
        {
          text: "Действия",
          value: "path",
          align: "left",
          sortable: false,
          width: 150
        }
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
        v => !!v || "Поле не может быть пустым",
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
    },
    resize() {
      const viewportHeight = window.innerHeight;
      const dtHeight = viewportHeight - 280 < 100 ? 100 : viewportHeight - 280;
      this.$refs["fwatchers-data-table"].$el.style.height = `${dtHeight}px`;
    }
  },
  mounted() {
    this.resize();
    window.addEventListener("resize", this.resize);
  },

  created() {
    this.$socket.emit("join", "WATCHERINFO", err => {
      if (err) {
        console.log("ERROR joining ", err);
      }
    });
  },
  beforeDestroy() {
    window.removeEventListener("resize", this.resize);
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
  overflow-y: scroll;
}

.my-title {
  background-color: #ececec;
  padding: 10px 20px;
}
</style>


