<template>
  <v-toolbar flat dense tile class="my-header">
    <v-toolbar-title class="title white--text">♽МедиаⱩонвертер</v-toolbar-title>
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


<style scoped lang="scss">
.v-btn--active {
  color: #f7dda2 !important;
}
.my-header {
  background-color: rgba(0,0,0,.25) !important;
}
</style>

