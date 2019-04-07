(window["webpackJsonp"]=window["webpackJsonp"]||[]).push([["chunk-2d0aabd1"],{"11fa":function(t,e,r){"use strict";r.r(e);var n=function(){var t=this,e=t.$createElement,r=t._self._c||e;return r("v-layout",{attrs:{row:"",nowrap:"","justify-center":""}},[r("v-flex",{attrs:{shrink:"","mr-3":""}},[r("v-card",{attrs:{"max-width":"430","min-width":"430"}},[r("v-card-title",[t._v("Редактирование обработчика:")]),r("v-card-text",[r("v-form",{ref:"form",model:{value:t.valid,callback:function(e){t.valid=e},expression:"valid"}},[r("v-text-field",{attrs:{disabled:!t.isEditing,rules:t.nameRules,label:"Название",required:""},on:{input:t.dataChanged},model:{value:t.tempWorker.name,callback:function(e){t.$set(t.tempWorker,"name",e)},expression:"tempWorker.name"}}),r("v-text-field",{attrs:{disabled:!t.isEditing,rules:t.hostRules,label:"Адрес хоста",required:""},on:{input:t.dataChanged},model:{value:t.tempWorker.host,callback:function(e){t.$set(t.tempWorker,"host",e)},expression:"tempWorker.host"}}),r("v-text-field",{attrs:{disabled:!t.isEditing,rules:t.portRules,label:"Порт хоста",required:""},on:{input:t.dataChanged},model:{value:t.tempWorker.port,callback:function(e){t.$set(t.tempWorker,"port",t._n(e))},expression:"tempWorker.port"}}),r("v-text-field",{attrs:{disabled:!t.isEditing,rules:t.tempFolderRules,label:"Папка с исходниками",required:""},on:{input:t.dataChanged},model:{value:t.tempWorker.sourceFolder,callback:function(e){t.$set(t.tempWorker,"sourceFolder",e)},expression:"tempWorker.sourceFolder"}}),r("v-text-field",{attrs:{disabled:!t.isEditing,rules:t.tempFolderRules,label:"Папка для временных файлов",required:""},on:{input:t.dataChanged},model:{value:t.tempWorker.tempFolder,callback:function(e){t.$set(t.tempWorker,"tempFolder",e)},expression:"tempWorker.tempFolder"}}),r("v-switch",{attrs:{disabled:!t.isEditing,label:"Автоконнект: "+(t.tempWorker.autoConnect?"Да":"Нет")},on:{change:t.dataChanged},model:{value:t.tempWorker.autoConnect,callback:function(e){t.$set(t.tempWorker,"autoConnect",e)},expression:"tempWorker.autoConnect"}}),r("v-textarea",{attrs:{disabled:!t.isEditing,label:"Описание",hint:"Опциональное описание"},on:{input:t.dataChanged},model:{value:t.tempWorker.description,callback:function(e){t.$set(t.tempWorker,"description",e)},expression:"tempWorker.description"}}),r("v-layout",{attrs:{row:"",nowrap:"","justify-end":""}},[t.isEditing?r("v-flex",{attrs:{shrink:"","align-self-end":""}},[r("v-btn",{attrs:{right:"",color:"error"},on:{click:t.reset}},[t._v("Отменить")]),r("v-btn",{attrs:{disabled:!t.valid||!t.hasChanged,color:"success"},on:{click:t.save}},[t._v("Сохранить")])],1):r("v-flex",{attrs:{shrink:"","align-self-end":""}},[r("v-btn",{attrs:{color:"error"},on:{click:t.remove}},[t._v("Удалить")]),r("v-btn",{attrs:{color:"warning",disabled:t.turnOnOffButton},on:{click:t.turnOnOff}},[t._v(t._s(t.connectionState))]),r("v-btn",{attrs:{color:"info"},on:{click:function(e){t.isEditing=!0}}},[t._v("Изменить")])],1)],1)],1)],1)],1)],1),r("v-flex",{attrs:{shrink:""}},[r("v-card",[r("v-card-title",[t._v("Инфо:")]),r("v-card-text",[r("v-text-field",{attrs:{readonly:"",outline:"",label:"Id",value:t.id?t.id:"-"}}),r("v-text-field",{attrs:{readonly:"",outline:"",label:"В работе",value:t.isBusy}}),r("v-text-field",{attrs:{readonly:"",outline:"",label:"Состояние",value:t.connectionMessage}})],1)],1)],1),r("v-snackbar",{attrs:{top:"",timeout:2e3,color:t.snackColor},model:{value:t.snackbar,callback:function(e){t.snackbar=e},expression:"snackbar"}},[t._v("\n    "+t._s(t.snackText)+"\n    "),r("v-btn",{attrs:{flat:""},on:{click:function(e){t.snackbar=!1}}},[t._v("Закрыть")])],1)],1)},o=[],i=(r("96cf"),r("3b8d")),a=(r("a481"),r("5176")),s=r.n(a),c=(r("7f7f"),r("7514"),r("cebc")),l=r("3be2"),d=r.n(l),u=(r("c5f6"),r("cadf"),r("551c"),r("097d"),r("2f62")),h={props:{id:Number},data:function(){return{hasChanged:!1,snackbar:!1,snackColor:"",snackText:"",isEditing:!1,turnOnOffButton:!1,tempWorker:{name:"",host:"",port:"",sourceFolder:"",tempFolder:"",autoConnect:!0,description:""},valid:!0,tempFolderRules:[function(t){return!!t||"Укажите папку"}],hostRules:[function(t){return!!t||"Укажите хост"}],nameRules:[function(t){return!!t||"Укажите имя"}],portRules:[function(t){return!!t||"Укажите порт"},function(t){return d()(t)&&t>0||"Должны быть цифры"},function(t){return t<65536||"Не может превышать 65535"}]}},computed:Object(c["a"])({},Object(u["c"])({workers:"workers/workers"}),{worker:function(){var t=this;return this.workers.find(function(e){return e.id===t.id})},connectionState:function(){var t=this.worker.condition.status;return 0===t?"подключить":1===t?"отключить":"ошибка"},connectionStatus:function(){return this.worker.condition.status},connectionMessage:function(){switch(this.worker.condition.message){case"transport close":return"Разрыв связи";case"io client disconnect":return"Отключён";default:return this.worker.condition.message}},isBusy:function(){return this.worker.condition.isBusy?"Да":"Нет"}}),watch:{worker:function(){this.turnOnOffButton=!1,this.initForm()},connectionStatus:function(t){this.turnOnOffButton&&(this.snackText=0===t?"Обработчик отключён":"Обработчик подключён",this.snackColor="warning",this.snackbar=!0,this.turnOnOffButton=!1)}},methods:Object(c["a"])({},Object(u["b"])({deleteWorker:"workers/deleteWorker",updateWorker:"workers/updateWorker",switchWorker:"workers/switchWorker"}),{dataChanged:function(){this.hasChanged=!0},initForm:function(){var t={};t.name=this.worker.name,t.host=this.worker.host,t.port=this.worker.port,t.tempFolder=this.worker.tempFolder,t.sourceFolder=this.worker.sourceFolder,t.autoConnect=this.worker.autoConnect,t.description=this.worker.description,this.tempWorker=s()({},this.tempWorker,t)},remove:function(){var t=this;confirm("Вы уверены что хотите удалить обработчик?")&&this.deleteWorker(this.id).then(function(){t.$router.replace({name:"general"})})},turnOnOff:function(){var t=this;confirm("Вы уверены что хотите ".concat(this.connectionState," обработчик?"))&&(this.turnOnOffButton=!0,this.switchWorker(this.worker.id).catch(function(e){t.snackText="Что-то пошло не так ".concat(e),t.snackColor="error",t.snackbar=!0}))},reset:function(){this.initForm(),this.isEditing=!1,this.hasChanged=!1},save:function(){var t=Object(i["a"])(regeneratorRuntime.mark(function t(){var e;return regeneratorRuntime.wrap(function(t){while(1)switch(t.prev=t.next){case 0:try{e=s()({},this.tempWorker),e.id=this.id,this.updateWorker(e),this.isEditing=!1,this.hasChanged=!1,this.snackText="Изменения сохранены",this.snackColor="success",this.snackbar=!0}catch(r){this.snackText="Ошибка сохранения ".concat(r.message),this.snackColor="error",this.snackbar=!0}case 1:case"end":return t.stop()}},t,this)}));function e(){return t.apply(this,arguments)}return e}()}),created:function(){this.initForm()},beforeRouteUpdate:function(t,e,r){this.isEditing?this.hasChanged?confirm("У вас есть несохраненные изменения! Продолжить без сохранения?")&&(this.reset(),r()):(this.reset(),r()):r()}},k=h,f=r("2877"),p=r("6544"),m=r.n(p),v=r("8336"),b=r("b0af"),w=r("99d9"),g=r("12b2"),x=r("0e8f"),W=r("4bd4"),C=r("a722"),F=r("2db4"),O=r("b73d"),_=r("2677"),E=r("a844"),y=Object(f["a"])(k,n,o,!1,null,null,null);y.options.__file="EditWorker.vue";e["default"]=y.exports;m()(y,{VBtn:v["a"],VCard:b["a"],VCardText:w["b"],VCardTitle:g["a"],VFlex:x["a"],VForm:W["a"],VLayout:C["a"],VSnackbar:F["a"],VSwitch:O["a"],VTextField:_["a"],VTextarea:E["a"]})}}]);