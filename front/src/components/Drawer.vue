<template>
  <v-navigation-drawer permanent value="true" class="my-drawer">
    <v-list expand>
      <v-list-tile class="list-tile" :to="{name: 'general'}">
        <v-list-tile-action>
          <v-icon>build</v-icon>
        </v-list-tile-action>
        <v-list-tile-title>Общие</v-list-tile-title>
      </v-list-tile>
      <v-list-tile class="list-tile" :to="{name: 'categories'}">
        <v-list-tile-action>
          <v-icon>category</v-icon>
        </v-list-tile-action>
        <v-list-tile-title>Категории</v-list-tile-title>
      </v-list-tile>
      <v-list-group prepend-icon="folder_open" v-model="fwListVisibility">
        <template v-slot:activator>
          <v-list-tile>
            <v-list-tile-title>Контроль файлов</v-list-tile-title>
          </v-list-tile>
        </template>
        <v-list-tile class="list-tile" :to="{name: 'FWPaths'}" exact>
          <v-list-tile-action></v-list-tile-action>
          <v-list-tile-title>Пути отслеживания</v-list-tile-title>
        </v-list-tile>
        <v-list-tile class="list-tile" :to="{name: 'fileWatchers'}" exact>
          <v-list-tile-action></v-list-tile-action>
          <v-list-tile-title>Наблюдатели</v-list-tile-title>
        </v-list-tile>
      </v-list-group>
      <v-list-group prepend-icon="storage" v-model="workersListVisibility">
        <template v-slot:activator>
          <v-list-tile>
            <v-list-tile-title>Обработчики</v-list-tile-title>
          </v-list-tile>
        </template>
        <v-list-tile class="list-tile" :to="{name: 'addWorker'}" exact>
          <v-list-tile-action></v-list-tile-action>
          <v-list-tile-title>Добавить</v-list-tile-title>
        </v-list-tile>
        <v-list-tile
          v-for="(worker, i) in workers"
          :key="i"
          class="list-tile"
          :to="{ name: 'editWorker', params: { id: worker.id }}"
        >
          <v-list-tile-action>
            <v-icon v-if="worker.state.status !== 0" color="green accent-4">link</v-icon>
            <v-icon v-else color="grey">link_off</v-icon>
          </v-list-tile-action>
          <v-list-tile-title v-text="worker.name"></v-list-tile-title>
        </v-list-tile>
      </v-list-group>
    </v-list>
  </v-navigation-drawer>
</template>

<script>
import { mapGetters } from "vuex";
export default {
  data: () => ({
    fwListVisibility: false,
    workersListVisibility: false
  }),
  computed: {
    ...mapGetters({
      workers: "workers/workers"
    })
  },
  watch: {
    fwListVisibility(newVal) {
      window.localStorage.setItem("fwListVisibility", newVal);
    },
    workersListVisibility(newVal) {
      window.localStorage.setItem("workersListVisibility", newVal);
    }
  },
  created() {
    const fwListVisibility = window.localStorage.getItem("fwListVisibility");
    const workersListVisibility = window.localStorage.getItem(
      "workersListVisibility"
    );
    if (fwListVisibility !== null) {
      this.fwListVisibility = JSON.parse(fwListVisibility);
    }
    if (workersListVisibility !== null) {
      this.workersListVisibility = JSON.parse(workersListVisibility);
    }
  }
};
</script>
<style scoped>
.list-tile:hover {
  background-color: #f5f5f5;
  cursor: pointer;
}
.drawer {
  border-radius: 0 10px 10px 0;
}
/* .sub-group {
  margin: 0 !important;
  padding: 0 !important;
} */
</style>


