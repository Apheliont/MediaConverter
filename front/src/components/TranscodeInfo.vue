<template>
  <v-layout class="container" row fill-height>
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
          hide-actions
          :headers="headers"
          :items="files"
          :search="search"
          :custom-filter="customFilter"
          class="my-data-table"
          transition="scale-transition"
        >
          <template slot="items" slot-scope="props">
            <td class="text-left">{{ props.item.id }}</td>
            <td class="text-left">
              <div class="my-name-field">{{ props.item.fileName }}{{ props.item.extension }}</div>
            </td>
            <td class="text-left">
              <v-progress-circular
                :rotate="270"
                :size="43"
                :width="5"
                :value="props.item.progress"
                color="green accent-4"
              >{{ props.item.progress || 0 }}</v-progress-circular>
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
        { text: "Состояние", value: "status", align: "left", width: 100 },
        { text: "Этап", value: "stage", align: "left", width: 120 },
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
      const dtHeight = viewportHeight - 520 < 100 ? 100 : viewportHeight - 520;
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
.v-progress-circular {
  margin: -0.3rem;
}
.my-data-table {
  margin-top: -4px;
  overflow-y: auto;
  background-color: #fff;
}

.my-title {
  background-color: #ececec !important;
}
</style>


