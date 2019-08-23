<template>
  <v-flex align-self-start>
    <v-card fill-height>
      <v-card-title class="my-title">
        Отслеживание путей:
        <v-spacer></v-spacer>
        <v-dialog v-model="dialog" max-width="500px" persistent>
          <v-btn slot="activator" color="#ce4b6d" dark class="mb-2">Добавить путь</v-btn>
          <v-card>
            <v-card-title>
              <span class="headline">{{ formTitle }}</span>
            </v-card-title>
            <v-card-text>
              <v-form v-model="valid">
                <v-container grid-list-md>
                  <v-layout column>
                    <v-flex xs12 sm6 md4>
                      <v-tooltip right v-model="tooltipPath" color="white">
                        <template v-slot:activator="{ on }">
                          <span>
                            <v-text-field
                              append-outer-icon="help_outline"
                              @click:append-outer="tooltipPath = !tooltipPath"
                              v-model="editedItem.path"
                              @input="hasChanged = true"
                              :rules="commonRules"
                              label="Путь отслеживания"
                              clearable
                            ></v-text-field>
                          </span>
                        </template>
                        <span>Укажите путь который будет контролироваться наблюдателем на наличие новых файлов. ВАЖНО! Этот путь должен быть доступен со стороны обработчиков, в противном случае файл обработан не будет!</span>
                      </v-tooltip>
                    </v-flex>
                    <v-flex xs12 sm6 md4>
                      <v-layout row nowrap>
                        <v-flex>
                          <v-tooltip left v-model="tooltipDelay" color="white">
                            <template v-slot:activator="{ on }">
                              <span>
                                <v-text-field
                                  append-outer-icon="help_outline"
                                  @click:append-outer="tooltipDelay = !tooltipDelay"
                                  v-model.number="editedItem.delay"
                                  @input="hasChanged = true"
                                  :rules="digitalRule"
                                  label="Минимальная задержка(сек)"
                                ></v-text-field>
                              </span>
                            </template>
                            <span>Это безусловная задержка между началом закачки файла и реакцией обработчика. Общее время реакции обработчика = задержка + размер файла/скорость участка сети</span>
                          </v-tooltip>
                        </v-flex>
                        <v-flex>
                          <v-tooltip right v-model="tooltipNetSpeed" color="white">
                            <template v-slot:activator="{ on }">
                              <span>
                                <v-text-field
                                  append-outer-icon="help_outline"
                                  @click:append-outer="tooltipNetSpeed = !tooltipNetSpeed"
                                  v-model.number="editedItem.netSpeed"
                                  @input="hasChanged = true"
                                  :rules="digitalRule"
                                  label="Скорость сети(МБ/с)"
                                ></v-text-field>
                              </span>
                            </template>
                            <span>Значение скорости сети нужно для расчета времени окончания закачки файла. Укажите скорость в мегабайт/сек на участке между клиентами и файловым хранилищем куда закачивается файл</span>
                          </v-tooltip>
                        </v-flex>
                      </v-layout>
                    </v-flex>
                    <v-flex xs12 sm6 md4>
                      <v-select
                        :items="categories"
                        item-text="name"
                        item-value="id"
                        :error="!editedItem.category"
                        v-model="editedItem.category"
                        @input="hasChanged = true"
                        label="Категория назначения"
                      ></v-select>
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
        <v-data-table
          ref="fwpaths-data-table"
          no-data-text
          :headers="headers"
          :items="fwpaths"
          hide-actions
          class="my-data-table"
          item-key="props.item.id"
          disable-initial-sort
        >
          <template slot="items" slot-scope="props">
            <td class="text-xs-left">{{ props.item.path }}</td>
            <td class="text-xs-left">{{ categoryToString(props.item.category) }}</td>
            <td class="text-xs-left">{{ props.item.delay }}</td>
            <td class="text-xs-left">{{ props.item.netSpeed }}</td>
            <td class="text-xs-left">
              <v-icon class="mr-2" @click="editItem(props.item)">edit</v-icon>
              <v-icon @click="deleteItem(props.item)">delete</v-icon>
            </td>
          </template>
        </v-data-table>
    </v-card>
  </v-flex>
</template>

<script>
import { mapGetters } from "vuex";
import { mapActions } from "vuex";
export default {
  data() {
    return {
      tooltipPath: false,
      tooltipDelay: false,
      tooltipNetSpeed: false,
      dialog: false,
      hasChanged: false,
      valid: false,
      headers: [
        {
          text: "Путь отслеживания",
          align: "left",
          value: "path"
        },
        {
          text: "Категория назначения",
          align: "left",
          value: "category"
        },
        {
          text: "Задержка(сек)",
          align: "left",
          value: "delay",
          width: 150
        },
        {
          text: "Скорость сети(МБ/с)",
          align: "left",
          value: "netSpeed",
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
      editedItem: {
        path: "",
        delay: 5,
        netSpeed: 80,
        category: ""
      },
      defaultItem: {
        path: "",
        delay: 5,
        netSpeed: 80,
        category: ""
      },
      commonRules: [v => (v && v.length > 0) || "Не может быть пустым"],
      digitalRule: [
        v => !!v || "Не может быть пустым",
        v =>
          (Number.isInteger(+v) && Number.isFinite(+v) && +v > 0) ||
          "Разрешены только цифры"
      ]
    };
  },
  computed: {
    ...mapGetters({
      categories: "categories/categories",
      fwpaths: "fwpaths/fwpaths"
    }),
    formTitle() {
      return this.editedIndex === -1
        ? "Добавить путь отслеживания"
        : "Редактирование";
    }
  },
  watch: {
    dialog(val) {
      val || this.close();
    }
  },

  methods: {
    ...mapActions("fwpaths", ["addFWPath", "updateFWPath", "deleteFWPath"]),
    categoryToString(id) {
      const categoryObj = this.categories.find(category => category.id === id);
      if (categoryObj) {
        return categoryObj.name;
      }
      return "----";
    },
    editItem(item) {
      this.editedIndex = this.fwpaths.indexOf(item);
      this.editedItem = Object.assign({}, item);
      this.dialog = true;
    },

    deleteItem(item) {
      confirm("Вы уверены что хотите удалить путь отслеживания?") &&
        this.deleteFWPath(item.id);
    },

    close() {
      this.dialog = false;
      this.hasChanged = false;
      setTimeout(() => {
        this.editedItem = Object.assign({}, this.defaultItem);
        this.editedIndex = -1;
      }, 300);
    },

    save() {
      this.hasChanged = false;
      if (this.editedIndex > -1) {
        this.updateFWPath(this.editedItem);
      } else {
        this.addFWPath(this.editedItem);
      }
      this.close();
    },

    resize() {
      const viewportHeight = window.innerHeight;
      const dtHeight = viewportHeight - 250 < 100 ? 100 : viewportHeight - 250;
      this.$refs["fwpaths-data-table"].$el.style.height = `${dtHeight}px`;
    }
  },
  mounted() {
    this.resize();
    window.addEventListener("resize", this.resize);
  },
  beforeDestroy() {
    window.removeEventListener("resize", this.resize);
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


