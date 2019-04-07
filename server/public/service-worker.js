importScripts("/precache-manifest.4928db80c3d9836c2d8433361cc02c2d.js", "https://storage.googleapis.com/workbox-cdn/releases/3.6.3/workbox-sw.js");

self.addEventListener('install', (event) => {
    console.log('SW installed!');
});

self.addEventListener('fetch', (event) => {

});

self.addEventListener('activate', (event) => {
    return self.clients.claim();
});

