"use strict";

importScripts("/static/localforage.js");

var baseUrl = new URL("/", this.location.href) + "";

this.addEventListener("install", function(evt) {
    console.log("SW oninstall");
});

this.addEventListener("activate", function(evt) {
    console.log("SW onactivate");
    if (clients.claim)
        evt.waitUntil(clients.claim());
});

this.addEventListener('push', function(evt) {
    var messagesUrl = "/chat/messages";
    evt.waitUntil(fetch(messagesUrl).then(function(response) {
        return response.text();
    }).then(function(messages) {
        console.log("SW onpush", messages);

        var usernameAndMessage = messages.split('\n').pop();

        var messageIsBlank = /^[^:]*: $/.test(usernameAndMessage);
        if (messageIsBlank)
            messages += "<empty message, so no notification shown>"

        // Store incoming messages (clients will read this by polling).
        var savePromise = localforage.setItem('messages', messages);

        if (messageIsBlank)
            return savePromise;

        // TODO: Don't show notification if chat tab is open and visible.
        var notifyPromise = showNotification(usernameAndMessage);

        return Promise.all([savePromise, notifyPromise]);
    }));
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
    // Demo for https://notifications.spec.whatwg.org/#actions
    if (username == 'onebutton') {
        options.actions = [{action: 'like', title: "👍 Like"}];
    } else {
        options.actions = [{action: 'like', title: "👍 Like"},
                           {action: 'shrug', title: "¯\\_(ツ)_/¯"}];
    }

    if (self.registration.showNotification)
        return self.registration.showNotification(title, options);

    // HACK: Firefox doesn't yet support showing notifications from Service
    // Workers. So instead postMessage to the window, if any, and tell it to
    // show a notification.
    return clients.matchAll({
        type: "window",
        includeUncontrolled: false
    }).then(function(clientList) {
        if (clientList.length) {
            clientList[0].postMessage({title: title, options: options});
        } else {
            console.warning("Your browser does not support showing " +
                            "notifications from a Service Worker. Try " +
                            "leaving a tab open, and then the SW might be " +
                            "able to show a notification via that tab (using " +
                            "postMessage).");
        }
    });
}

this.addEventListener('notificationclick', function(evt) {
    console.log("SW notificationclick");
    evt.notification.close();
    // Enumerate windows, and call window.focus(), or open a new one.
    evt.waitUntil(clients.matchAll({
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
            if (client.focus)
                return client.focus();
        }
        if (clients.openWindow)
            return clients.openWindow("/chat/");
    }).then(function(client) {
        // Demo for https://notifications.spec.whatwg.org/#actions
        if (evt.action)
            client.postMessage({action: evt.action});
    }));
});

console.log('Logged from inside SW');
