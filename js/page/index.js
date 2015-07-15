// This code is hacky. Please don't learn anything from it.

(function() {
  var supports = (function() {
    var hasPush = !!window.PushManager;
    var hasNotification = 'ServiceWorkerRegistration' in window &&
      'showNotification' in ServiceWorkerRegistration.prototype;
    var hasServiceWorker = 'serviceWorker' in navigator;
    var supportsPush = hasPush && hasNotification && hasServiceWorker;
    var missingMessage = '';

    if (!supportsPush) {
      if (!hasPush || !hasServiceWorker) {
        missingMessage = "Your browser does not support "
          + (hasPush ? "ServiceWorker" : hasServiceWorker ? "push messaging" : "push messaging or ServiceWorker")
          + "; you won't be able to receive messages.";
      } else if (!hasNotification) {
        missingMessage = "Your browser doesn't support showing notifications from a Service Worker; you won't be able to receive messages when the page is not open";
      }
    }
    
    return {
      supportsPush: supportsPush,
      missingMessage: missingMessage
    };
  }());

  var $ = document.querySelector.bind(document);
  var usernamePromise = localforage.getItem('username');
  var swRegisterPromise = navigator.serviceWorker.register('/chat/sw.js');
  
  swRegisterPromise.then(function(reg) {
    if (!reg.active) {
      // This is a fresh registration
      // Remove existing username details
      return localforage.removeItem('username').then(function() {
        return null;
      });
    }
    return usernamePromise;
  });
}());