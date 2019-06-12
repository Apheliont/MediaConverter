<template>
  <v-container grid-list-md text-xs-center class="my-container">
    <div class="text-xs-center">
      <v-dialog v-model="workerInfo" width="500">
        <v-card>
          <v-card-title class="headline grey lighten-2" primary-title>Статистика по обработчикам</v-card-title>
          <v-card-text>
            <table class="my-worker-info">
              <thead>
                <th>Этап</th>
                <th>ID Обработчика(ов)</th>
              </thead>
              <tbody>
                <tr>
                  <td>Подготовка</td>
                  <td>{{ activeLogWorkers["stage_0"] }}</td>
                </tr>
                <tr>
                  <td>Кодирование</td>
                  <td>{{ activeLogWorkers["stage_1"].join(",") }}</td>
                </tr>
                <tr>
                  <td>Склейка</td>
                  <td>{{ activeLogWorkers["stage_2"] }}</td>
                </tr>
              </tbody>
            </table>
          </v-card-text>
          <v-divider></v-divider>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="primary" flat @click="workerInfo = false">Пойдет</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
      <v-dialog v-model="errorInfo" width="900">
        <v-card>
          <v-card-title class="headline grey lighten-2" primary-title>Описание ошибки</v-card-title>
          <v-card-text>
            <pre class="my-error-info" v-html="activeErrorMessage"></pre>
          </v-card-text>
          <v-divider></v-divider>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="primary" flat @click="errorInfo = false">Понять и простить</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </div>
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
                    :headers="headers[tab.key]"
                    :items="tab.data"
                    :search="search"
                    class="elevation-1 my-data-table"
                    :custom-filter="customFilter"
                    v-bind:pagination.sync="pagination"
                    hide-actions
                  >
                    <template slot="items" slot-scope="props">
                      <td class="text-xs-left">{{ props.item.id }}</td>
                      <td
                        class="my-file-name text-xs-left"
                      >{{ props.item.fileName }}{{ props.item.extension }}</td>
                      <td class="text-xs-left">{{ props.item.size | humanReadableSize}}</td>
                      <td class="text-xs-left">{{ props.item.duration | durationToHR }}</td>
                      <td class="text-xs-left">{{ categoryToString(props.item.category) }}</td>
                      <td class="text-xs-left">{{ props.item.created_at | dateToHR }}</td>
                      <td class="text-xs-left">{{ props.item.processing_at | dateToHR }}</td>
                      <td class="text-xs-left">{{ props.item.finished_at | dateToHR }}</td>
                      <td v-if="tab.key === 'success'" class="text-xs-left">
                        <v-icon
                          @click="workerInfo = true; activeLogWorkers = JSON.parse(props.item.workers)"
                        >description</v-icon>
                      </td>
                      <td v-if="tab.key === 'error'" class="text-xs-left">
                        <v-icon @click="showError(props.item)">report_problem</v-icon>
                      </td>
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
import { mapActions } from "vuex";
export default {
  data() {
    return {
      workerInfo: false,
      errorInfo: false,
      activeErrorMessage: "",
      activeLogWorkers: {
        stage_0: "",
        stage_1: [],
        stage_2: ""
      },
      workerInfoHeader: [
        {
          text: "Этап",
          align: "left",
          sortable: false,
          value: "stage"
        },
        { text: "№ Обработчика(ов)", value: "workers" }
      ],
      pagination: {
        sortBy: "id",
        descending: true,
        rowsPerPage: -1
      },
      headers: {
        success: [
          { text: "ID", value: "id" },
          { text: "Имя файла", value: "fileName" },
          { text: "Размер", value: "size" },
          { text: "Длительность", value: "duration" },
          { text: "Категория", value: "category" },
          { text: "Добавлен", value: "created_at" },
          { text: "Начало", value: "processing_at" },
          { text: "Завершение", value: "finished_at" },
          { text: "Обработчики", value: "workers", sortable: false, width: 150 }
        ],
        error: [
          { text: "ID", value: "id" },
          { text: "Имя файла", value: "fileName" },
          { text: "Размер", value: "size" },
          { text: "Длительность", value: "duration" },
          { text: "Категория", value: "category" },
          { text: "Добавлен", value: "created_at" },
          { text: "Начало", value: "processing_at" },
          { text: "Завершение", value: "finished_at" },
          { text: "Ошибка", value: "workers", sortable: false, width: 150 }
        ]
      },
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
        color: "success",
        key: "success"
      };
      firstObj.data = this.okLogs;

      const secondObj = {
        name: "С ошибкой",
        icon: "report",
        color: "error",
        key: "error"
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
      return val === 0 ? "Успех" : val === 1 ? "Ошибка" : "Удален";
    }
  },
  methods: {
    ...mapActions({
      getError: "logs/getError"
    }),
    showError(log) {
      if (log.errorMessage) {
        this.activeErrorMessage = log.errorMessage;
        this.errorInfo = true;
        return;
      }
      this.getError(log.id).then(() => {
        this.activeErrorMessage = log.errorMessage;
        this.errorInfo = true;
      });
    },
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

.my-worker-info {
  width: 100%;
}

.my-worker-info td {
  padding: 5px 10px 5px 15px;
  border: 1px solid rgb(119, 119, 119);
}

.my-error-info {
  white-space: pre-wrap;
  word-wrap: break-word;
}
</style>

