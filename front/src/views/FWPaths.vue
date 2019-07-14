<template>
  <v-flex align-self-start>
    <v-card fill-height>
      <v-card-title class="my-title">
        Отслеживание путей:
        <v-spacer></v-spacer>
        <v-dialog v-model="dialog" max-width="500px" persistent>
          <v-btn slot="activator" color="primary" dark class="mb-2">Добавить путь</v-btn>
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
                        v-model="editedItem.path"
                        @input="hasChanged = true"
                        :rules="commonRules"
                        label="Путь отслеживания"
                        clearable
                      ></v-text-field>
                    </v-flex>
                    <v-flex xs12 sm6 md4>
                      <v-layout row nowrap>
                        <v-flex>
                          <v-text-field
                            v-model.number="editedItem.delay"
                            @input="hasChanged = true"
                            :rules="digitalRule"
                            label="Минимальная задержка(сек)"
                            hint="До активации наблюдателя"
                          ></v-text-field>
                        </v-flex>
                        <v-flex>
                          <v-text-field
                            v-model.number="editedItem.netSpeed"
                            @input="hasChanged = true"
                            :rules="digitalRule"
                            label="Скорость сети(МБ/с)"
                            hint="Между клиентами и этим путём"
                          ></v-text-field>
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
      <v-card-text>
        <v-data-table
          :headers="headers"
          :items="fwpaths"
          hide-actions
          class="elevation-2 my-data-table"
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
          value: "delay"
        },
        {
          text: "Скорость сети(МБ/с)",
          align: "left",
          value: "netSpeed"
        },
        { text: "Действия", value: "path", align: "left", sortable: false }
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
      commonRules: [v => (v && v.length > 0) || "Поле не может быть пустым"],
      digitalRule: [
        v => !!v || "Поле не может быть пустым",
        v =>
          (Number.isInteger(+v) && Number.isFinite(+v) && +v > 0) ||
          "Поле должно содержать только цифры"
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
      return this.categories.find(category => category.id === Number(id)).name;
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
    }
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


