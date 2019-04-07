<template>
    <v-container class="my-edit-dialog" pa-3>
      <v-layout column nowrap>
        <v-flex>
          <v-text-field
            @keyup.enter="save"
            :value="editfilename"
            @input="fileName = $event"
            :rules="[max50chars, forbidenSymbols, notEmpty, notTheSameName]"
            label="Имя файла"
            ref="editor"
            single-line
            clearable
            counter
          ></v-text-field>
        </v-flex>
        <v-flex>
          <v-layout row nowrap justify-end>
            <v-flex shrink>
              <v-btn color="error" flat right @click="cancel">Отмена</v-btn>
            </v-flex>
            <v-flex shrink>
              <v-btn flat color="success" :disabled="!isValid" @click="save">Сохранить</v-btn>
            </v-flex>
          </v-layout>
        </v-flex>
      </v-layout>
    </v-container>
</template>

<script>
export default {
  props: ["editfilename", "files"],
  data() {
    return {
      fileName: "",
      originalFileName: this.editfilename,
      max50chars: v => {
        if (v) {
          return v.length <= 50 || "Превышен размер!";
        }
        return true;
      },
      forbidenSymbols: v => {
        if (v) {
          const regExp = /[.*\\/:'"|?]/i;
          return !regExp.test(v) || "Использован запрещенный символ";
        }
        return true;
      },
      notTheSameName: v => {
        if (v) {
          let occurance = 0;
          this.files.forEach(file => {
            if (file.fileName === v) {
              occurance++;
            }
          });
          return occurance < 2 || "Такое имя уже есть!";
        }
        return true;
      },
      notEmpty: v => {
        return (v && v.length > 0) || "Введите имя файла!";
      }
    };
  },
  computed: {
    isValid() {
      const rules = [
        this.max50chars,
        this.forbidenSymbols,
        this.notTheSameName,
        this.notEmpty
      ];
      for (let rule of rules) {
        if (rule(this.fileName) !== true) {
          return false;
        }
      }
      return true;
    }
  },
  methods: {
    cancel() {
      this.$emit("cancel");
    },
    save() {
      if (!this.isValid) {
        return;
      }
      const objToPass = {};
      objToPass.originalFileName = this.originalFileName;
      objToPass.changedFileName = this.fileName;
      this.$emit("save", objToPass);
    }
  },
  mounted() {
    this.$refs.editor.focus();
  }
};
</script>

<style scoped>
.my-edit-dialog {
  position: absolute;
  top: 10px;
  left: 0px;
  right: 0px;
  bottom: 20px;
  width: 550px;
  height: 160px;
  z-index: 999;
  background-color: #fff;
  box-shadow: 5px 5px 10px rgba(0, 0, 0, 0.03);
}

</style>

