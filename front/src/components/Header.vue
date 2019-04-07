<template>
  <v-toolbar class="my-header">
    <v-toolbar-title class="title white--text">Импорт в Bram</v-toolbar-title>
    <v-toolbar-items>
      <v-btn flat to="/" exact class="subheading">
        <v-icon left class="white--text">home</v-icon>Главная
      </v-btn>
      <v-btn flat to="/logs" class="subheading">
        <v-icon left class="white--text">insert_chart</v-icon>Статистика
      </v-btn>
    </v-toolbar-items>
    <v-spacer></v-spacer>
    <v-btn flat to="/settings/general" class="subheading">
      <v-icon left class="white--text">settings</v-icon>Настройки
    </v-btn>
  </v-toolbar>
</template>

<script>
export default {};
</script>

<style scoped>
.v-btn--active {
  color: #b3e099 !important;
}
.my-header {
  background-color: #028f76 !important;
}
</style>

