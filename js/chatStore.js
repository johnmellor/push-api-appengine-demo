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
      
      if (request instanceof IDBRequest) {
        request.onsuccess = _ => resolve(request.result);
      }
      else if (request) {
        resolve(request);
      }

      transaction.onerror = _ => reject(transaction.error);
      transaction.oncomplete = _ => resolve(transaction.result);
    });
  });
}

function iterate(cursorRequest, callback) {
  return new Promise((resolve, reject) => {
    cursorRequest.onerror = _ => reject(request.error);
    cursorRequest.onsuccess = _ => {
      if (!cursorRequest.result) {
        resolve();
        return;
      } 
      callback(cursorRequest.result, resolve);
    };
  });
}

function getAll(cursorable) {
  if ('getAll' in cursorable) {
    return cursorable.getAll();
  }

  var items = [];

  return iterate(cursorable.openCursor(), (cursor) => {
    items.push(cursor.value);
    cursor.continue();
  }).then(_ => items);
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

export function getFirstOutboxItem() {
  return tx('outbox', 'readonly', transaction => {
    return transaction.objectStore('outbox').index('by-date').get(IDBKeyRange.lowerBound(new Date(0)));
  });
}

export function getOutbox() {
  return tx('outbox', 'readonly', transaction => {
    return getAll(transaction.objectStore('outbox').index('by-date'));
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
    return getAll(transaction.objectStore('chat').index('by-date'));
  });
}
