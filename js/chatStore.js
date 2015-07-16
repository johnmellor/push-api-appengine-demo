let dbPromise;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDb();
  }
  return dbPromise;
}

function tx(stores, mode, callback) {
  return getDb().then(db => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(stores, mode);
      const request = callback(transaction);
      
      if (request) {
        request.onsuccess = _ => resolve(request.result);
      }

      transaction.onerror = _ => reject(transaction.error);
      transaction.oncomplete = _ => resolve(transaction.result);
    });
  });
}

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("push-chat", 1);
    request.onupgradeneeded = _ => {
      const db = request.result;
      var outbox = db.createObjectStore('outbox', {keyPath: 'id'});
      outbox.createIndex('by-date', 'date');
      var chat = db.createObjectStore('chat', {keyPath: 'id'});
      chat.createIndex('by-date', 'date');
      db.createObjectStore('keyval');
    };
    request.onerror = _ => reject(request.error);
    request.onsuccess = _ => resolve(request.result);
  });
}

export function addToOutbox(message) {
  return tx('outbox', 'readwrite', transaction => {
    transaction.objectStore('outbox').add(message);
  });
}

export function removeFromOutbox(id) {
  return tx('outbox', 'readwrite', transaction => {
    transaction.objectStore('outbox').delete(id);
  });
}

export function setChatMessages(messages) {
  return tx('chat', 'readwrite', transaction => {
    const chat = transaction.objectStore('chat');
    chat.clear();
    messages.forEach(m => chat.add(m));
  });
}

export function addChatMessage(message) {
  return addChatMessages([message]);
}

export function addChatMessages(messages) {
  return tx('chat', 'readwrite', transaction => {
    const chat = transaction.objectStore('chat');
    messages.forEach(m => chat.put(m));
  });
}

export function getChatMessages() {
  return tx('chat', 'readonly', transaction => {
    return transaction.objectStore('chat').index('by-date').getAll();
  });
}
