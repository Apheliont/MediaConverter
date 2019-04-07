self.addEventListener('install', (event) => {
    console.log('SW installed!');
});

self.addEventListener('fetch', (event) => {

});

self.addEventListener('activate', (event) => {
    return self.clients.claim();
});
