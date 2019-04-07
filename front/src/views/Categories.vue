<template>
  <v-flex align-self-start>
    <v-card fill-height>
      <v-card-title class="my-title">
        Редактор категорий:
        <v-spacer></v-spacer>
        <v-dialog v-model="dialog" max-width="500px" persistent>
          <v-btn slot="activator" color="primary" dark class="mb-2">Добавить категорию</v-btn>
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
                        v-model="editedItem.name"
                        @input="hasChanged = true"
                        :rules="commonRules"
                        label="Название"
                        clearable
                      ></v-text-field>
                    </v-flex>
                    <v-flex xs12 sm6 md4>
                      <v-text-field
                        v-model="editedItem.path"
                        @input="hasChanged = true"
                        :rules="commonRules"
                        label="Путь для сохранения"
                        clearable
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
          :items="categories"
          hide-actions
          class="elevation-2 my-data-table"
          item-key="props.item.id"
          disable-initial-sort
        >
          <template slot="items" slot-scope="props">
            <td class="text-xs-left">{{ props.item.id }}</td>
            <td class="text-xs-left">{{ props.item.name }}</td>
            <td class="text-xs-left">{{ props.item.path }}</td>
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
import { mapActions } from "vuex";
import { mapGetters } from "vuex";
export default {
  data: () => ({
    dialog: false,
    hasChanged: false,
    valid: false,
    headers: [
      {
        text: "ID",
        align: "left",
        value: "id"
      },
      {
        text: "Название",
        align: "left",
        value: "name"
      },
      { text: "Путь", align: "left", value: "path" },
      { text: "Действия", value: "name", align: "left", sortable: false }
    ],
    editedIndex: -1,
    editedItem: {
      name: "",
      path: ""
    },
    defaultItem: {
      name: "",
      path: ""
    },
    commonRules: [v => (v && v.length > 0) || "Поле не может быть пустым"]
  }),

  computed: {
    ...mapGetters({
      categories: "categories/categories"
    }),
    formTitle() {
      return this.editedIndex === -1 ? "Новая категория" : "Редактирование";
    }
  },

  watch: {
    dialog(val) {
      val || this.close();
    }
  },

  methods: {
    ...mapActions("categories", [
      "addCategory",
      "updateCategory",
      "deleteCategory"
    ]),
    editItem(item) {
      this.editedIndex = this.categories.indexOf(item);
      this.editedItem = Object.assign({}, item);
      this.dialog = true;
    },

    deleteItem(item) {
      confirm("Вы уверены что хотите удалить категорию?") &&
        this.deleteCategory(item.id);
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
        this.updateCategory(this.editedItem);
      } else {
        this.addCategory(this.editedItem);
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


