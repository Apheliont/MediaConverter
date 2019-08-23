<template>
<v-container fluid class="my-container">
  <v-layout row>
    <v-flex align-self-start grow>
      <v-card flat>
        <v-card-title class="title my-title">
          Импортируемые файлы:
          <v-spacer></v-spacer>
          <v-text-field
            v-model="search"
            append-icon="search"
            label="Поиск"
            single-line
            hide-details
          ></v-text-field>
        </v-card-title>
        <v-data-table
          ref="transcode-data-table"
          no-data-text
          hide-actions
          :headers="headers"
          :items="files"
          :search="search"
          :custom-filter="customFilter"
          class="my-data-table"
        >
          <template slot="items" slot-scope="props">
            <td class="text-left">{{ props.item.id }}</td>
            <td class="text-left">
              <div class="my-name-field">{{ props.item.fileName }}{{ props.item.extension }}</div>
            </td>
            <td class="text-left my-data-table__row_progress-bar">
              <v-progress-linear
                class="my-progress-bar"
                striped
                background-opacity="0"
                height="22"
                :value="props.item.progress"
                color="blue lighten-2"
              >{{ props.item.progress || 0 }}</v-progress-linear>
            </td>
            <td class="text-left">{{ props.item.status | statusToText() }}</td>
            <td class="text-left">{{ props.item.stage | stageToText() }}</td>
            <td class="text-left">{{ categoryToString(props.item.category) }}</td>
            <td class="text-left">{{ props.item.workers | workerIDToHR }}</td>
            <td class="text-left">{{ props.item.duration | durationToHR }}</td>
            <td class="text-left">{{ props.item.size | humanReadableSize }}</td>
            <td>
              <v-icon @click="deleteItem(props.item)">delete</v-icon>
            </td>
          </template>
        </v-data-table>
      </v-card>
    </v-flex>
  </v-layout>
</v-container>
</template>

<script>
import { mapGetters, mapActions } from "vuex";
export default {
  data() {
    return {
      search: "",
      selected: [],
      headers: [
        { text: "ID", value: "id", align: "left", width: 50 },
        { text: "Имя файла", value: "fileName", align: "left", width: 350 },
        { text: "Прогресс", value: "progress", align: "left", width: 80 },
        { text: "Состояние", value: "status", align: "left", width: 140 },
        { text: "Этап", value: "stage", align: "left", width: 140 },
        { text: "Категория", value: "category", align: "left", width: 150 },
        { text: "Обработчики", value: "workers", align: "left", width: 70 },
        { text: "Длительность", value: "duration", align: "left", width: 50 },
        { text: "Размер", value: "size", align: "left", width: 120 },
        { text: "Удалить", value: "id", sortable: false, width: 150 }
      ]
    };
  },
  computed: {
    ...mapGetters({
      files: "files/files",
      categories: "categories/categories"
    })
  },
  methods: {
    ...mapActions({
      deleteFile: "files/deleteFile"
    }),
    customFilter(items, search, filter) {
      search = search.toString().toLowerCase();
      return items.filter(row => filter(row["fileName"], search));
    },
    deleteItem(item) {
      confirm(`Вы уверены что хотите удалить файл ${item.fileName}?`) &&
        this.deleteFile(item.id);
    },
    categoryToString(id) {
      return this.categories.find(category => category.id === Number(id)).name;
    },
    resize() {
      const viewportHeight = window.innerHeight;
      const dtHeight = viewportHeight - 350 < 100 ? 100 : viewportHeight - 350;
      this.$refs["transcode-data-table"].$el.style.height = `${dtHeight}px`;
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

.my-name-field {
  max-width: 350px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.my-data-table {
  margin-top: -5px;
  overflow-y: auto;
  background-color: #fff;
  border: 1px solid rgba(0, 0, 0, 0.13);
}

.my-data-table__row_progress-bar {
  padding: 2px 15px 2px 5px !important;
}

.my-title {
  background-color: #ececec !important;
}

.my-progress-bar {
  border-radius: 5px;
  border: 1px solid rgba(0, 0, 0, 0.13);
  text-align: center;
  color: rgb(56, 56, 56);
}
</style>


