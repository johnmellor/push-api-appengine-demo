import "babelify/node_modules/babel-core/node_modules/regenerator/runtime";
import "serviceworker-cache-polyfill";
import * as chatStore from "../chatStore";
import toMessageObj from "../toMessageObj";

self.addEventListener("install", event => {
  self.skipWaiting();

  event.waitUntil(
    caches.open('chat-static-v2').then(cache => {
      return cache.addAll(
        [
          '/',
          '/static/css/app.css',
          '/static/fonts/roboto.woff',
          '/static/js/page.js',
          '/static/imgs/cat.png',
          '/static/imgs/hangouts.png'
        ].map(u => new Request(u, {credentials: 'include'}))
      );
    })
  );
});

const cachesToKeep = ['chat-static-v2'];

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
        icon: `https://www.gravatar.com/avatar/${notificationMessage.userId}?d=retro&amp;s=80`
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
    event.notification.close();
    // Enumerate windows, and call window.focus(), or open a new one.
    event.waitUntil(
      clients.matchAll().then(matchedClients => {
        for (let client of matchedClients) {
          if (client.url === '/') {
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
    data.set('message', message.text);
    const pushSub = await self.registration.pushManager.getSubscription();

    if (pushSub) {
      let endpoint = pushSub.endpoint;
      if ('subscriptionId' in pushSub && !endpoint.includes(pushSub.subscriptionId)) {
        endpoint += "/" + pushSub.subscriptionId;
      }
      data.set('push_endpoint', endpoint);
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

/*

self.addEventListener('sync', function(event) {
  // There are a lot of race conditions with the outbox.
  // Ideally I should use IDB properly & have an outbox store where
  // each entry is a message.
  console.log('Background sync event');
  // TODO: add event.waitUntil once it's supported
  localforage.getItem('outbox').then(function(messages) {
    if (!messages) return;
    return messages.reduce(function(chain, message) {
      return chain.then(function() {
        var formData = new FormData();
        formData.append('message', message);
        return fetch('/chat/send', {
          method: 'POST',
          body: formData
        });
      }).then(function(response) {
        if (response.status < 200 || response.status >= 300) {
          var error = Error(response.statusText);
          error.status = response.status;
          throw error;
        }
        messages.shift();
        return localforage.setItem('outbox', messages);
      });
    }, Promise.resolve());
  }).then(function() {
    return broadcast({
      'setStatus': 'Sent',
      'type': 'success'
    });
  }).catch(function(err) {
    if ('status' in err) {
      // I'm happy to recover from these kinds of errors.
      // Could mean one of the messages in the outbox is
      // unsendable, so happy to ditch the outbox.
      broadcast({
        'setStatus': err.message,
        'type': 'fail'
      });
      return localforage.setItem('outbox', []);
    }
    throw err;
  });
});

function broadcast(message) {
  return clients.matchAll().then(function(clients) {
    for (var client of clients) {
      client.postMessage(message);
    }
  });
}

function showNotification(usernameAndMessage) {
  var splits = usernameAndMessage.split(/: (.*)/);
  var username = splits[0];
  var message = splits[1];

  var title = "Chat from " + username;
  var options = {
    body: message,
    tag: 'chat',
    icon: '/static/cat.png'
  };

  if (self.registration.showNotification) {
    return self.registration.showNotification(title, options);
  }

  // HACK: Firefox doesn't yet support showing notifications from Service
  // Workers. So instead postMessage to the window, if any, and tell it to
  // show a notification.
  return clients.matchAll({
    type: "window"
  }).then(function(clientList) {
    if (clientList.length) {
      clientList[0].postMessage({
        notification: {title: title, options: options}
      });
    } else {
      console.warning(
        "Your browser does not support showing " +
        "notifications from a Service Worker. Try " +
        "leaving a tab open, and then the SW might be " +
        "able to show a notification via that tab (using " +
        "postMessage)."
      );
    }
  });
}

self.addEventListener('notificationclick', function(event) {
    console.log("SW notificationclick");
    event.notification.close();
    // Enumerate windows, and call window.focus(), or open a new one.
    event.waitUntil(clients.matchAll({
      type: "window",
      includeUncontrolled: true
    }).catch(function(ex) {
      // Chrome doesn't yet support includeUncontrolled:true crbug.com/455241
      if (ex.name != "NotSupportedError")
        throw ex;
      return clients.matchAll({
        type: "window",
        includeUncontrolled: false
      });
    }).then(function(clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        // TODO: Intelligently choose which client to focus.
        if (client.focus) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow("/chat/");
    }));
});

console.log('Logged from inside SW');
*/