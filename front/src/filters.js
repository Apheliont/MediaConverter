import Vue from 'vue';

Vue.filter('humanReadableSize', function (value) {
    return `${(value / (1024 * 1024)).toFixed(2)} Mb`;
});
Vue.filter('durationToHR', function (value) {
    if (value === null) {
        return "--/--/--";
    }
    const date = new Date(null);
    date.setSeconds(value);
    return date.toISOString().substr(11, 8);
})

Vue.filter('workerIDToHR', function (value) {
    return value === null ? '---' : value;
})