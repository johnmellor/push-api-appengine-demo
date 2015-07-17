import "babelify/node_modules/babel-core/node_modules/regenerator/runtime";
import "serviceworker-cache-polyfill";
import * as chatStore from "../chatStore";
import toMessageObj from "../toMessageObj";

self.addEventListener("install", event => {
  self.skipWaiting();

  event.waitUntil(
    caches.open('chat-static-v5').then(cache => {
      return cache.addAll(
        [
          '/',
          '/static/css/app.css',
          '/static/fonts/roboto.woff',
          '/static/js/page.js',
          '/static/imgs/hangouts.png'
        ].map(u => new Request(u, {credentials: 'include'}))
      );
    })
  );
});

const cachesToKeep = ['chat-static-v5'];

self.addEventListener('activate', event => {
  clients.claim();
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(n => cachesToKeep.indexOf(n) === -1)
          .map(name => caches.delete(name))
      );
    })
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;

  if (request.method != 'GET') return;

  event.respondWith(
    caches.match(request).then(function(response) {
      return response || fetch(request);
    })
  );
});

self.addEventListener('push', event => {
  event.waitUntil(
    fetch("/messages.json", {
      credentials: "include"
    }).then(async response => {
      const messages = (await response.json()).messages.map(m => toMessageObj(m));
      await chatStore.setChatMessages(messages);
      broadcast('updateMessages');

      for (var client of (await clients.matchAll())) {
        if (client.visibilityState == 'visible' && new URL(client.url).pathname == '/') {
          return;
        }
      }

      const notificationMessage = messages[messages.length - 1];

      return self.registration.showNotification("New Chat!", {
        body: notificationMessage.text,
        tag: 'chat',
        icon: `https://www.gravatar.com/avatar/${notificationMessage.userId}?d=retro&s=192`
      });
    })
  );
});

function broadcast(message) {
  return clients.matchAll().then(function(clients) {
    for (var client of clients) {
      client.postMessage(message);
    }
  });
}

self.addEventListener('notificationclick', event => {
    const rootUrl = new URL('/', location).href;
    event.notification.close();
    // Enumerate windows, and call window.focus(), or open a new one.
    event.waitUntil(
      clients.matchAll().then(matchedClients => {
        for (let client of matchedClients) {
          if (client.url === rootUrl) {
            return client.focus();
          }
        }
        return clients.openWindow("/");
      })
    );
});

async function postOutbox() {
  let message;
  while (message = await chatStore.getFirstOutboxItem()) {
    let data = new FormData();
    data.append('message', message.text);
    const pushSub = await self.registration.pushManager.getSubscription();

    if (pushSub) {
      let endpoint = pushSub.endpoint;
      if ('subscriptionId' in pushSub && !endpoint.includes(pushSub.subscriptionId)) {
        endpoint += "/" + pushSub.subscriptionId;
      }
      data.append('push_endpoint', endpoint);
    }

    let response = await fetch('/send', {
      method: 'POST',
      body: data,
      credentials: 'include'
    });

    await chatStore.removeFromOutbox(message.id);

    if (!response.ok) {
      broadcast({
        sendFailed: message.id
      });
      continue;
    }

    let sentMessage = toMessageObj(await response.json());
    chatStore.addChatMessage(sentMessage);

    broadcast({
      messageSent: message.id,
      message: sentMessage
    });
  }
}

self.addEventListener('message', event => {
  if (event.data == 'postOutbox') {
    postOutbox();
  }
});

self.addEventListener('sync', event => {
  event.waitUntil(postOutbox());
});