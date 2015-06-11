"use strict";

importScripts("/static/localforage.js");
importScripts("/static/cache-polyfill.js");

self.addEventListener("install", function(event) {
  console.log("SW oninstall");
  self.skipWaiting();

  event.waitUntil(
    caches.open('chat-static-v1').then(function(cache) {
      return cache.addAll([
        '/chat/',
        '/static/hamburger.svg',
        '/static/hangouts.png',
        '/static/localforage.js',
        '/static/cat.png',
        '/static/chat.png',
        '/static/send.png',
        '/static/roboto.css',
        '/static/roboto.woff'
      ]);
    })
  );
});

self.addEventListener("activate", function(event) {
  console.log("SW onactivate");
  if (clients.claim) clients.claim();
});

self.addEventListener('fetch', function(event) {
  var request = event.request;

  if (request.method != 'GET') return;

  event.respondWith(
    caches.match(request).then(function(response) {
      return response || fetch(request);
    })
  );
});

self.addEventListener('push', function(event) {
  event.waitUntil(
    fetch("/chat/messages").then(function(response) {
      return response.text();
    }).then(function(messages) {
      console.log("SW onpush", messages);

      var usernameAndMessage = messages.split('\n').pop();

      var messageIsBlank = /^[^:]*: $/.test(usernameAndMessage);
      if (messageIsBlank) {
        messages += "<empty message, so no notification shown>";
      }

      // Store incoming messages (clients will read this by polling).
      var savePromise = localforage.setItem('messages', messages);

      if (messageIsBlank) {
        return savePromise;
      }

      var notifyPromise;

      return clients.matchAll().then(function(clients) {
        for (var client of clients) {
          if (client.visibilityState == 'visible' && new URL(client.url).pathname == '/chat/') {
            return savePromise;
          }
        }

        return Promise.all([
          savePromise,
          showNotification(usernameAndMessage)
        ])
      });
    })
  );
});

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
      clientList[0].postMessage({title: title, options: options});
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
