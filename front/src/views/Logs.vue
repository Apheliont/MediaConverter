<template>
  <v-container grid-list-md text-xs-center class="my-container">
    <v-layout column fill-height>
      <v-flex>
        <v-card>
          <v-card-title class="title my-title">
            Информация по завершенным операциям:
            <v-spacer></v-spacer>
            <v-text-field
              v-model="search"
              append-icon="search"
              label="Поиск"
              single-line
              hide-details
            ></v-text-field>
          </v-card-title>
          <v-tabs v-model="active" grow color="#f4f4f4" slider-color="#b3e099" class="my-tabs">
            <v-tab v-for="tab in tabs" :key="tab.name" ripple>
              <v-icon left :color="tab.color">{{ tab.icon }}</v-icon>
              {{ tab.name }}
            </v-tab>
            <v-tab-item v-for="tab in tabs" :key="tab.name">
              <v-card flat color="white">
                <v-card-text>
                  <v-data-table
                    ref="log-data-table"
                    :headers="headers"
                    :items="tab.data"
                    :search="search"
                    class="elevation-1 my-data-table"
                    :custom-filter="customFilter"
                    v-bind:pagination.sync="pagination"
                    hide-actions
                  >
                    <template slot="items" slot-scope="props">
                      <td class="text-xs-left">{{ props.item.file_id }}</td>
                      <td class="my-file-name text-xs-left">{{ props.item.fileName }}{{ props.item.extension }}</td>
                      <td class="text-xs-left">{{ props.item.size | humanReadableSize}}</td>
                      <td class="text-xs-left">{{ props.item.duration | durationToHR }}</td>
                      <td class="text-xs-left">{{ categoryToString(props.item.category) }}</td>
                      <td class="text-xs-left">{{ props.item.created_at | dateToHR }}</td>
                      <td class="text-xs-left">{{ props.item.processing_at | dateToHR }}</td>
                      <td class="text-xs-left">{{ props.item.finished_at | dateToHR }}</td>
                      <td class="text-xs-left">{{ props.item.workerID | workerIDToHR }}</td>
                    </template>
                  </v-data-table>
                </v-card-text>
              </v-card>
            </v-tab-item>
          </v-tabs>
        </v-card>
      </v-flex>
    </v-layout>
  </v-container>
</template>

<script>
import { mapGetters } from "vuex";
export default {
  data() {
    return {
      pagination: {
        sortBy: "file_id",
        descending: true,
        rowsPerPage: -1
      },
      headers: [
        { text: "ID", value: "file_id" },
        { text: "Имя файла", value: "fileName" },
        { text: "Размер", value: "size" },
        { text: "Длительность", value: "duration" },
        { text: "Категория", value: "category" },
        { text: "Добавлен", value: "created_at" },
        { text: "Начало", value: "processing_at" },
        { text: "Завершение", value: "finished_at" },
        { text: "№ Обработчика", value: "workerID" }
      ],
      active: "",
      search: ""
    };
  },
  computed: {
    ...mapGetters({
      logs: "logs/logs",
      categories: "categories/categories"
    }),
    okLogs() {
      return this.logs.filter(row => row.status === 0);
    },
    errorLogs() {
      return this.logs.filter(row => row.status === 1);
    },
    tabs() {
      const arr = [];
      const firstObj = {
        name: "Успешно завершенные",
        icon: "done",
        color: "success"
      };
      firstObj.data = this.okLogs;

      const secondObj = {
        name: "С ошибкой",
        icon: "report",
        color: "error"
      };
      secondObj.data = this.errorLogs;
      arr.push(firstObj, secondObj);
      return arr;
    }
  },
  filters: {
    dateToHR(val) {
      if (val === null) {
        return "---";
      }
      return new Date(val).toLocaleString();
    },
    statusToString(val) {
      return val === 0 ? "Успех" : "Ошибка";
    }
  },
  methods: {
    categoryToString(id) {
      return this.categories.find(category => category.id === id).name;
    },
    customFilter(items, search, filter) {
      search = search.toString().toLowerCase();
      return items.filter(row => filter(row["fileName"], search));
    },
    resize() {
      const viewportHeight = window.innerHeight;
      const dtHeight = viewportHeight - 420 < 100 ? 100 : viewportHeight - 420;
      for (let dt of this.$refs["log-data-table"]) {
        dt.$el.style.height = `${dtHeight}px`;
      }
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
  overflow-y: scroll;
}
.my-title {
  background-color: #ececec !important;
}
.my-tabs {
  margin-top: -5px;
}

.my-file-name {
  max-width: 400px;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
}
</style>

