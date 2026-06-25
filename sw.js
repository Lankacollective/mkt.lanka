/* mkt.lanka — Service Worker v1 */
const CACHE = 'mktlanka-v1';

self.addEventListener('install', e => {
    self.skipWaiting();
});

self.addEventListener('activate', e => {
    e.waitUntil(clients.claim());
});

self.addEventListener('push', e => {
    if (!e.data) return;
    let data = {};
    try { data = e.data.json(); } catch { data = { title: 'mkt.lanka', body: e.data.text() }; }

    const title = data.title || 'mkt.lanka';
    const opts  = {
        body:    data.body  || '',
        icon:    data.icon  || '/icon-192.png',
        badge:   data.badge || '/icon-72.png',
        tag:     data.tag   || 'mktlanka-notif',
        data:    { url: data.url || '/', notifId: data.notifId || '' },
        actions: data.actions || [],
        requireInteraction: data.requireInteraction || false,
    };
    e.waitUntil(self.registration.showNotification(title, opts));
});

self.addEventListener('notificationclick', e => {
    e.notification.close();
    const url = e.notification.data?.url || '/';
    e.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
            const match = list.find(c => c.url.includes(url) && 'focus' in c);
            if (match) return match.focus();
            return clients.openWindow(url);
        })
    );
});
