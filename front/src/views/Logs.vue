<template>
  <v-layout column nowrap fill-height>
    <v-flex>
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
      <v-container fluid class="my-container">
        <v-layout row>
          <v-flex align-self-start>
            <v-card>
              <v-card-title class="title my-title">
                Информация по завершенным операциям:
                <v-spacer></v-spacer>
                <v-text-field
                  @input="search"
                  append-icon="search"
                  label="Поиск"
                  single-line
                  hide-details
                ></v-text-field>
              </v-card-title>
              <v-tabs
                v-model="active"
                fixed-tabs
                grow
                color="#f4f4f4"
                slider-color="#4794ee"
                class="my-tabs"
              >
                <v-tab @click="tabClicked(tab.key)" v-for="tab in tabs" :key="tab.name" ripple>
                  <v-icon left :color="tab.color">{{ tab.icon }}</v-icon>
                  {{ tab.name }}
                </v-tab>
                <v-tab-item v-for="tab in tabs" :key="tab.name">
                  <v-card flat>
                    <v-data-table
                      ref="log-data-table"
                      no-data-text
                      :headers="headers[tab.key]"
                      :items="tab.data"
                      class="my-data-table"
                      v-bind:pagination.sync="pagination"
                      hide-actions
                    >
                      <template slot="items" slot-scope="props">
                        <td class="text-xs-left">{{ props.item.id }}</td>
                        <td>
                          <div class="my-name-field text-xs-left">
                            <v-tooltip right open-delay="600" max-width="500" color="white">
                              <template v-slot:activator="{ on }">
                                <span v-on="on">{{ props.item.fileName }}{{ props.item.extension }}</span>
                              </template>
                              <span>{{ props.item.fileName }}{{ props.item.extension }}</span>
                            </v-tooltip>
                          </div>
                        </td>
                        <td class="text-xs-left">{{ props.item.size | humanReadableSize}}</td>
                        <td class="text-xs-left">{{ props.item.duration | durationToHR }}</td>
                        <td class="text-xs-left">{{ categoryToString(props.item.category) }}</td>
                        <td class="text-xs-left">{{ props.item.created_at | dateToHR }}</td>
                        <td class="text-xs-left">{{ props.item.processing_at | dateToHR }}</td>
                        <td class="text-xs-left">
                          <v-tooltip top open-delay="600" max-width="500" color="white">
                            <template v-slot:activator="{ on }">
                              <span v-on="on">{{ props.item.finished_at | dateToHR }}</span>
                            </template>
                            <span>{{ calculteDuration(props.item.processing_at, props.item.finished_at) }}</span>
                          </v-tooltip>
                        </td>
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
                  </v-card>
                </v-tab-item>
              </v-tabs>
            </v-card>
          </v-flex>
        </v-layout>
      </v-container>
    </v-flex>
    <v-flex class="text-xs-center" align-self-center shrink>
      <div class="my-pagination">
        <v-pagination
          @input="updatePagination"
          :value="currentPage"
          v-if="pages > 0"
          :length="pages"
        ></v-pagination>
      </div>
    </v-flex>
  </v-layout>
</template>

<script>
import { mapGetters } from "vuex";
import { mapActions } from "vuex";
export default {
  data() {
    return {
      searchString: "",
      searchDebounce: null,
      currentPage: 1,
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
        rowsPerPage: 10, // дефолтное значение, будет переопределно в хуке mounted
        status: 0
      },
      headers: {
        success: [
          { text: "ID", value: "id" },
          { text: "Имя файла", value: "fileName", width: 350 },
          { text: "Размер", value: "size", width: 130 },
          { text: "Длительность", value: "duration" },
          { text: "Категория", value: "category", width: 150 },
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
      active: ""
    };
  },
  watch: {
    // каждый раз как изменяется объект pagination, тащим данные с сервера
    // в нем меняются данные: какую страницу показать, как отсортировать и т.д
    // ЭТОТ ВАРИАНТ НЕ РАБОТАЕТ ОТДЕЛЬНО ОТ МЕТОДА updatePagination, только оба
    pagination: {
      handler() {
        this.getLogs(
          Object.assign(
            {},
            this.pagination,
            { page: this.currentPage },
            { search: this.searchString }
          )
        );
      },
      deep: true
    }
  },
  computed: {
    ...mapGetters({
      logs: "logs/logs",
      totalItems: "logs/totalItems",
      categories: "categories/categories"
    }),
    pages() {
      const rowsPerPage = this.pagination.rowsPerPage;
      const totalItems = this.totalItems;
      if (totalItems <= rowsPerPage) return 0;
      return Math.ceil(totalItems / rowsPerPage);
    },
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
      getError: "logs/getError",
      getLogs: "logs/getLogs"
    }),
    calculteDuration(startTime, endTime) {
      const totalSeconds = (new Date(endTime) - new Date(startTime)) / 1000;
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds - (3600 * hours + minutes * 60);
      return `Время в работе: ${hours < 9 ? "0" + hours : hours}ч:${
        minutes < 9 ? "0" + minutes : minutes
      }м:${seconds < 9 ? "0" + seconds : seconds}с`;
    },
    search(str) {
      this.searchString = str.trim();
      if (this.searchDebounce) {
        clearTimeout(this.searchDebounce);
        this.searchDebounce = null;
      }
      this.searchDebounce = setTimeout(() => {
        this.currentPage = 1;
        this.getLogs(
          Object.assign(
            {},
            this.pagination,
            { page: this.currentPage },
            { search: this.searchString }
          )
        );
      }, 300);
    },
    // это чертов хак, т.к паджинация после обновления данных сбрасывается в дефолт
    updatePagination(page) {
      this.currentPage = page;
      this.getLogs(
        Object.assign(
          {},
          this.pagination,
          { page },
          { search: this.searchString }
        )
      );
    },
    tabClicked(key) {
      const status = key === "error" ? 1 : 0;
      if (status === this.pagination.status) return;
      // в дополнение к смене статуса, что вызовет реакцию вотчера и последует запрос
      // данных к серверу, нам надо сбросить текущую страницу на 1
      this.currentPage = 1;
      this.pagination.status = status;
    },
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
      const categoryObj = this.categories.find(category => category.id === id);
      if (categoryObj) {
        return categoryObj.name;
      }
      return "----";
    },
    resize() {
      const tab = document.querySelector(".v-window__container");

      const viewportHeight = window.innerHeight;
      const dtHeight = viewportHeight - 380 < 100 ? 100 : viewportHeight - 380;
      tab.style.height = `${dtHeight}px`;
      for (let dt of this.$refs["log-data-table"]) {
        dt.$el.style.height = `${dtHeight}px`;
      }
    }
  },
  mounted() {
    this.resize();
    // устанавливаем оптимальное кол-во строк таблицы в зависимости от высоты экрана
    // вычисляем высоту рабочей области таблицы(без высоты заголовка 40px)
    const dtViewPortHeight =
      parseInt(this.$refs["log-data-table"][0].$el.style.height) - 40;
    // высота одной строки таблицы 50px
    const optimalRowNumber = Math.floor(dtViewPortHeight / 50);
    if (isFinite(optimalRowNumber)) {
      this.pagination.rowsPerPage = optimalRowNumber;
    }
    window.addEventListener("resize", this.resize);
  },
  beforeDestroy() {
    window.removeEventListener("resize", this.resize);
  }
};
</script>

<style scoped>
.my-data-table {
  overflow-y: auto;
}
.my-title {
  background-color: #ececec !important;
}
.my-tabs {
  margin-top: -5px;
}

.my-name-field {
  width: 350px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.my-pagination {
  width: 600px;
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

