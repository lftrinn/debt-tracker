self.addEventListener('push', (event) => {
  const data = event.data?.json() || {}
  const options = {
    body: data.body || '',
    icon: '/debt-tracker/icon-192.png',
    badge: '/debt-tracker/icon-192.png',
    data: { url: data.url || '/debt-tracker/' },
    requireInteraction: false,
  }
  if (data.tag) options.tag = data.tag
  event.waitUntil(
    self.registration.showNotification(data.title || ' ', options)
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes('/debt-tracker/') && 'focus' in client) {
            return client.focus()
          }
        }
        return clients.openWindow(event.notification.data?.url || '/debt-tracker/')
      })
  )
})
