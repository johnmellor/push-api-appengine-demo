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
      db.createObjectStore('outbox', {keyPath: 'id'});
      db.createObjectStore('chat', {keyPath: 'id'});
      db.createObjectStore('keyval');
    };
    request.onerror = _ => reject(request.error);
    request.onsuccess = _ => resolve(request.result);
  });
}

export function addToOutbox(message) {
  return tx('outbox', 'readwrite', transaction => {
    transaction.objectStore('outbox').outbox.add(message);
  });
}

export function setChatMessages(messages) {
  return tx('chat', 'readwrite', transaction => {
    const chat = transaction.objectStore('chat');
    chat.clear();
    messages.forEach(m => chat.add(m));
  });
}

export function getChatMessages() {
  return tx('chat', 'readonly', transaction => {
    return transaction.objectStore('chat').getAll();
  });
}
