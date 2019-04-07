(window["webpackJsonp"]=window["webpackJsonp"]||[]).push([["chunk-399818d4"],{"0adb":function(t,e,i){"use strict";i.r(e);var n=function(){var t=this,e=t.$createElement,i=t._self._c||e;return i("v-layout",{attrs:{row:"",nowrap:"","justify-center":""}},[i("v-flex",{attrs:{shrink:""}},[i("v-card",{attrs:{"min-width":"430"}},[i("v-card-title",[t._v("Добавление обработчика:")]),i("v-card-text",[i("v-form",{ref:"form",model:{value:t.valid,callback:function(e){t.valid=e},expression:"valid"}},[i("v-text-field",{attrs:{rules:t.nameRules,label:"Название",required:""},on:{input:t.dataChanged},model:{value:t.worker.name,callback:function(e){t.$set(t.worker,"name",e)},expression:"worker.name"}}),i("v-text-field",{attrs:{rules:t.hostRules,label:"Адрес",required:""},on:{input:t.dataChanged},model:{value:t.worker.host,callback:function(e){t.$set(t.worker,"host",e)},expression:"worker.host"}}),i("v-text-field",{attrs:{rules:t.portRules,label:"Порт",required:""},on:{input:t.dataChanged},model:{value:t.worker.port,callback:function(e){t.$set(t.worker,"port",t._n(e))},expression:"worker.port"}}),i("v-text-field",{attrs:{label:"Папка с исходниками",rules:t.tempFolderRules,required:""},on:{input:t.dataChanged},model:{value:t.worker.sourceFolder,callback:function(e){t.$set(t.worker,"sourceFolder",e)},expression:"worker.sourceFolder"}}),i("v-text-field",{attrs:{label:"Папка для временных файлов",rules:t.tempFolderRules,required:""},on:{input:t.dataChanged},model:{value:t.worker.tempFolder,callback:function(e){t.$set(t.worker,"tempFolder",e)},expression:"worker.tempFolder"}}),i("v-switch",{attrs:{label:"Автоконнект: "+(t.worker.autoConnect?"Да":"Нет")},on:{change:t.dataChanged},model:{value:t.worker.autoConnect,callback:function(e){t.$set(t.worker,"autoConnect",e)},expression:"worker.autoConnect"}}),i("v-textarea",{attrs:{name:"description",label:"Описание",hint:"Опциональное описание"},on:{input:t.dataChanged},model:{value:t.worker.description,callback:function(e){t.$set(t.worker,"description",e)},expression:"worker.description"}}),i("v-layout",{attrs:{row:"",nowrap:"","justify-end":""}},[i("v-flex",{attrs:{shrink:""}},[i("v-btn",{attrs:{disabled:!t.hasChanged,right:"",color:"error"},on:{click:t.reset}},[t._v("Сбросить")]),i("v-btn",{attrs:{disabled:!t.valid,color:"success"},on:{click:t.submit}},[t._v("Добавить")])],1)],1)],1)],1)],1)],1)],1)},r=[],a=i("cebc"),o=i("3be2"),s=i.n(o),u=i("2f62"),l={data:function(){return{hasChanged:!1,worker:{name:"",host:"",port:"",tempFolder:"",sourceFolder:"",autoConnect:!1,description:""},valid:!0,tempFolderRules:[function(t){return!!t||"Укажите папку"}],hostRules:[function(t){return!!t||"Укажите хост"}],nameRules:[function(t){return!!t||"Укажите имя"}],portRules:[function(t){return!!t||"Укажите порт"},function(t){return s()(t)&&t>0||"Должны быть цифры"},function(t){return t<65536||"Не может превышать 65535"}]}},methods:Object(a["a"])({},Object(u["b"])({addWorker:"workers/addWorker"}),{dataChanged:function(){this.hasChanged=!0},submit:function(){var t=this;this.addWorker(this.worker).then(function(e){t.$router.push({name:"editWorker",params:{id:e.id,worker:e}})})},reset:function(){this.$refs.form.reset(),this.hasChanged=!1}})},c=l,h=i("2877"),d=i("6544"),f=i.n(d),p=i("8336"),v=i("b0af"),m=i("99d9"),g=i("12b2"),b=i("0e8f"),w=i("4bd4"),k=i("a722"),C=i("b73d"),V=i("2677"),_=i("a844"),x=Object(h["a"])(c,n,r,!1,null,null,null);x.options.__file="AddWorker.vue";e["default"]=x.exports;f()(x,{VBtn:p["a"],VCard:v["a"],VCardText:m["b"],VCardTitle:g["a"],VFlex:b["a"],VForm:w["a"],VLayout:k["a"],VSwitch:C["a"],VTextField:V["a"],VTextarea:_["a"]})},"0cd9":function(t,e,i){var n=i("f772"),r=Math.floor;t.exports=function(t){return!n(t)&&isFinite(t)&&r(t)===t}},"26e5":function(t,e,i){},"2e29":function(t,e,i){},"3be2":function(t,e,i){t.exports=i("8790")},"4bd4":function(t,e,i){"use strict";i("26e5");var n=i("94ab");e["a"]={name:"v-form",mixins:[Object(n["b"])("form")],inheritAttrs:!1,props:{value:Boolean,lazyValidation:Boolean},data:function(){return{inputs:[],watchers:[],errorBag:{}}},watch:{errorBag:{handler:function(){var t=Object.values(this.errorBag).includes(!0);this.$emit("input",!t)},deep:!0,immediate:!0}},methods:{watchInput:function(t){var e=this,i=function(t){return t.$watch("hasError",function(i){e.$set(e.errorBag,t._uid,i)},{immediate:!0})},n={_uid:t._uid,valid:void 0,shouldValidate:void 0};return this.lazyValidation?n.shouldValidate=t.$watch("shouldValidate",function(r){r&&(e.errorBag.hasOwnProperty(t._uid)||(n.valid=i(t)))}):n.valid=i(t),n},validate:function(){var t=this.inputs.filter(function(t){return!t.validate(!0)}).length;return!t},reset:function(){for(var t=this,e=this.inputs.length;e--;)this.inputs[e].reset();this.lazyValidation&&setTimeout(function(){t.errorBag={}},0)},resetValidation:function(){for(var t=this,e=this.inputs.length;e--;)this.inputs[e].resetValidation();this.lazyValidation&&setTimeout(function(){t.errorBag={}},0)},register:function(t){var e=this.watchInput(t);this.inputs.push(t),this.watchers.push(e)},unregister:function(t){var e=this.inputs.find(function(e){return e._uid===t._uid});if(e){var i=this.watchers.find(function(t){return t._uid===e._uid});i.valid&&i.valid(),i.shouldValidate&&i.shouldValidate(),this.watchers=this.watchers.filter(function(t){return t._uid!==e._uid}),this.inputs=this.inputs.filter(function(t){return t._uid!==e._uid}),this.$delete(this.errorBag,e._uid)}}},render:function(t){var e=this;return t("form",{staticClass:"v-form",attrs:Object.assign({novalidate:!0},this.$attrs),on:{submit:function(t){return e.$emit("submit",t)}}},this.$slots.default)}}},5368:function(t,e,i){"use strict";var n=i("c37a"),r=i("3ccf"),a=i("2b0e"),o=a["a"].extend({name:"rippleable",directives:{Ripple:r["a"]},props:{ripple:{type:[Boolean,Object],default:!0}},methods:{genRipple:function(){var t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{};return this.ripple?(t.staticClass="v-input--selection-controls__ripple",t.directives=t.directives||[],t.directives.push({name:"ripple",value:{center:!0}}),t.on=Object.assign({click:this.onChange},this.$listeners),this.$createElement("div",t)):null},onChange:function(){}}}),s=i("5e28");e["a"]=n["a"].extend({name:"selectable",mixins:[o,s["a"]],model:{prop:"inputValue",event:"change"},props:{color:{type:String,default:"accent"},id:String,inputValue:null,falseValue:null,trueValue:null,multiple:{type:Boolean,default:null},label:String},data:function(t){return{lazyValue:t.inputValue}},computed:{computedColor:function(){return this.isActive?this.color:this.validationState},isMultiple:function(){return!0===this.multiple||null===this.multiple&&Array.isArray(this.internalValue)},isActive:function(){var t=this,e=this.value,i=this.internalValue;return this.isMultiple?!!Array.isArray(i)&&i.some(function(i){return t.valueComparator(i,e)}):void 0===this.trueValue||void 0===this.falseValue?e?this.valueComparator(e,i):Boolean(i):this.valueComparator(i,this.trueValue)},isDirty:function(){return this.isActive}},watch:{inputValue:function(t){this.lazyValue=t}},methods:{genLabel:function(){if(!this.hasLabel)return null;var t=n["a"].options.methods.genLabel.call(this);return t.data.on={click:this.onChange},t},genInput:function(t,e){return this.$createElement("input",{attrs:Object.assign({"aria-label":this.label,"aria-checked":this.isActive.toString(),disabled:this.isDisabled,id:this.id,role:t,type:t},e),domProps:{value:this.value,checked:this.isActive},on:{blur:this.onBlur,change:this.onChange,focus:this.onFocus,keydown:this.onKeydown},ref:"input"})},onBlur:function(){this.isFocused=!1},onChange:function(){var t=this;if(!this.isDisabled){var e=this.value,i=this.internalValue;if(this.isMultiple){Array.isArray(i)||(i=[]);var n=i.length;i=i.filter(function(i){return!t.valueComparator(i,e)}),i.length===n&&i.push(e)}else i=void 0!==this.trueValue&&void 0!==this.falseValue?this.valueComparator(i,this.trueValue)?this.falseValue:this.trueValue:e?this.valueComparator(i,e)?null:e:!i;this.validate(!0,i),this.internalValue=i}},onFocus:function(){this.isFocused=!0},onKeydown:function(t){}}})},"5e28":function(t,e,i){"use strict";var n=i("2b0e"),r=i("80d2");e["a"]=n["a"].extend({name:"comparable",props:{valueComparator:{type:Function,default:r["f"]}}})},8516:function(t,e,i){var n=i("63b6");n(n.S,"Number",{isInteger:i("0cd9")})},8790:function(t,e,i){i("8516"),t.exports=i("584a").Number.isInteger},"94a7":function(t,e,i){},b73d:function(t,e,i){"use strict";i("94a7"),i("2e29");var n=i("5368"),r=i("c341"),a=i("0789"),o=i("490a"),s=i("80d2"),u=Object.assign||function(t){for(var e=1;e<arguments.length;e++){var i=arguments[e];for(var n in i)Object.prototype.hasOwnProperty.call(i,n)&&(t[n]=i[n])}return t};e["a"]={name:"v-switch",directives:{Touch:r["a"]},mixins:[n["a"]],props:{loading:{type:[Boolean,String],default:!1}},computed:{classes:function(){return{"v-input--selection-controls v-input--switch":!0}},switchData:function(){return this.setTextColor(this.loading?void 0:this.computedColor,{class:this.themeClasses})}},methods:{genDefaultSlot:function(){return[this.genSwitch(),this.genLabel()]},genSwitch:function(){return this.$createElement("div",{staticClass:"v-input--selection-controls__input"},[this.genInput("checkbox",this.$attrs),this.genRipple(this.setTextColor(this.computedColor,{directives:[{name:"touch",value:{left:this.onSwipeLeft,right:this.onSwipeRight}}]})),this.$createElement("div",u({staticClass:"v-input--switch__track"},this.switchData)),this.$createElement("div",u({staticClass:"v-input--switch__thumb"},this.switchData),[this.genProgress()])])},genProgress:function(){return this.$createElement(a["b"],{},[!1===this.loading?null:this.$slots.progress||this.$createElement(o["a"],{props:{color:!0===this.loading||""===this.loading?this.color||"primary":this.loading,size:16,width:2,indeterminate:!0}})])},onSwipeLeft:function(){this.isActive&&this.onChange()},onSwipeRight:function(){this.isActive||this.onChange()},onKeydown:function(t){(t.keyCode===s["n"].left&&this.isActive||t.keyCode===s["n"].right&&!this.isActive)&&this.onChange()}}}},c341:function(t,e,i){"use strict";var n=i("80d2"),r=function(t){var e=t.touchstartX,i=t.touchendX,n=t.touchstartY,r=t.touchendY,a=.5,o=16;t.offsetX=i-e,t.offsetY=r-n,Math.abs(t.offsetY)<a*Math.abs(t.offsetX)&&(t.left&&i<e-o&&t.left(t),t.right&&i>e+o&&t.right(t)),Math.abs(t.offsetX)<a*Math.abs(t.offsetY)&&(t.up&&r<n-o&&t.up(t),t.down&&r>n+o&&t.down(t))};function a(t,e){var i=t.changedTouches[0];e.touchstartX=i.clientX,e.touchstartY=i.clientY,e.start&&e.start(Object.assign(t,e))}function o(t,e){var i=t.changedTouches[0];e.touchendX=i.clientX,e.touchendY=i.clientY,e.end&&e.end(Object.assign(t,e)),r(e)}function s(t,e){var i=t.changedTouches[0];e.touchmoveX=i.clientX,e.touchmoveY=i.clientY,e.move&&e.move(Object.assign(t,e))}function u(t){var e={touchstartX:0,touchstartY:0,touchendX:0,touchendY:0,touchmoveX:0,touchmoveY:0,offsetX:0,offsetY:0,left:t.left,right:t.right,up:t.up,down:t.down,start:t.start,move:t.move,end:t.end};return{touchstart:function(t){return a(t,e)},touchend:function(t){return o(t,e)},touchmove:function(t){return s(t,e)}}}function l(t,e,i){var r=e.value,a=r.parent?t.parentElement:t,o=r.options||{passive:!0};if(a){var s=u(e.value);a._touchHandlers=Object(a._touchHandlers),a._touchHandlers[i.context._uid]=s,Object(n["o"])(s).forEach(function(t){a.addEventListener(t,s[t],o)})}}function c(t,e,i){var r=e.value.parent?t.parentElement:t;if(r&&r._touchHandlers){var a=r._touchHandlers[i.context._uid];Object(n["o"])(a).forEach(function(t){r.removeEventListener(t,a[t])}),delete r._touchHandlers[i.context._uid]}}e["a"]={inserted:l,unbind:c}}}]);