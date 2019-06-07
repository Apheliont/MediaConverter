<template>
  <v-navigation-drawer permanent value="true" class="my-drawer">
    <v-list>
      <v-list-tile class="list-tile" :to="{name: 'general'}">
        <v-list-tile-action>
          <v-icon>build</v-icon>
        </v-list-tile-action>
        <v-list-tile-title>Общие</v-list-tile-title>
      </v-list-tile>
      <v-list-tile class="list-tile" :to="{name: 'categories'}">
        <v-list-tile-action>
          <v-icon>style</v-icon>
        </v-list-tile-action>
        <v-list-tile-title>Категории</v-list-tile-title>
      </v-list-tile>

      <v-list-group prepend-icon="device_hub" value="true" ml-3>
        <v-list-tile slot="activator">
          <v-list-tile-title>Обработчики</v-list-tile-title>
        </v-list-tile>
        <v-list-tile class="list-tile" :to="{name: 'addWorker'}" exact>
          <v-list-tile-action>
            <v-icon>add</v-icon>
          </v-list-tile-action>
          <v-list-tile-title>Добавить</v-list-tile-title>
        </v-list-tile>
        <v-divider></v-divider>
        <v-list-tile
          v-for="(worker, i) in workers"
          :key="i"
          class="list-tile"
          :to="{ name: 'editWorker', params: { id: worker.id }}"
        >
          <v-list-tile-action>
            <v-icon
              :color="`${worker.state.status === 0 ? 'grey lighten-2' :
             worker.state.status === 1 ? 'light-green accent-4' : 'red'}`"
            >developer_board</v-icon>
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
  data: () => ({}),
  computed: {
    ...mapGetters({
      workers: "workers/workers"
    })
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
</style>


