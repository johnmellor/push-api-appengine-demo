import "regenerator/runtime";
import ChatView from "./views/Chat";
import GlobalWarningView from "./views/GlobalWarning";
import MessageInputView from "./views/MessageInput";
import * as chatStore from "../chatStore";
import toMessageObj from "../toMessageObj";

const $ = document.querySelector.bind(document);

class MainController {
  constructor() {
    this.chatView = new ChatView($('.chat-content'), userId);
    this.globalWarningView = new GlobalWarningView($('.global-warning'));
    this.messageInputView = new MessageInputView($('.message-input'));
    this.logoutEl = $('.logout');
    this.serviceWorkerReg = this.registerServiceWorker();
    this.pushSubscription = this.registerPush();
    this.reloading = false;

    // events
    this.logoutEl.addEventListener('click', event => {
      event.preventDefault();
      this.logout();
    });

    if (navigator.serviceWorker) {
      window.addEventListener('message', event => { // non-standard Chrome behaviour
        if (event.origin && event.origin != location.origin) return;
        this.onServiceWorkerMessage(event.data);
      });
      navigator.serviceWorker.addEventListener("message", event => this.onServiceWorkerMessage(event.data));
      navigator.serviceWorker.addEventListener('controllerchange', _ => this.onServiceWorkerControllerChange());
    }

    this.messageInputView.on('sendmessage', ({message}) => this.onSend(message));
    this.messageInputView.on('keyboardopen', _ => this.onKeyboardOpen());
    window.addEventListener('resize', _ => this.onResize());

    // init
    if (navigator.serviceWorker) {
      this.displayMessages();
    }
    else {
      this.fallbackPollMessages();
    }
  }

  onKeyboardOpen() {
    this.chatView.performScroll({instant: true});
  }

  onResize() {
    // Scroll to bottom when keyboard opens
    // Somewhat of a hack.
    if (this.messageInputView.inputFocused()) {
      this.chatView.performScroll({instant: true});
    }
  }

  onServiceWorkerControllerChange() {
    if (this.messageInputView.inputIsEmpty()) {
      if (this.reloading) return;
      this.reloading = true;
      window.location.reload();
    }
    // TODO: I should show a toast if the input isn't empty
  }

  async onServiceWorkerMessage(message) {
    if (message == 'updateMessages') {
      await this.mergeCachedMessages();
    }
    else if ('loginUrl' in message) {
      window.location.href = message.loginUrl;
    }
    else if ('messageSent' in message) {
      this.chatView.markSent(message.messageSent, {
        newId: message.message.id,
        newDate: message.message.date
      });
    }
    else if ('sendFailed' in message) {
      this.chatView.markFailed(message.sendFailed.id, message.sendFailed.reason);
    }
  }

  async mergeCachedMessages() {
    this.chatView.mergeMessages(await chatStore.getChatMessages());
  }

  async onSend(message) {
    this.messageInputView.resetInput();
    const tempId = Date.now() + Math.random();
    const newMessage = {
      userId,
      text: message,
      date: new Date(),
      sending: true,
      id: tempId,
    };

    // No point doing idb storage if there's no SW
    // Also means we don't have to deal with Safari's mad IDB 
    if (navigator.serviceWorker) { 
      await chatStore.addToOutbox(newMessage);
    }
    
    this.chatView.addMessage(newMessage);

    if (navigator.serviceWorker) {
      const reg = await this.serviceWorkerReg;

      if (reg.sync && reg.sync.getTags) {
        await reg.sync.register('postOutbox');
      }
      else {
        reg.active.postMessage('postOutbox');
      }
    }
  }

  // this is only run in service-worker supporting browsers
  async displayMessages() {
    const dataPromise = fetch('/messages.json', {
      credentials: 'include'
    }).then(r => r.json());

    await this.mergeCachedMessages();
    this.chatView.mergeMessages(await chatStore.getOutbox());

    const data = await dataPromise;

    if (data.loginUrl) {
      window.location.href = data.loginUrl;
      return;
    }

    const messages = data.messages.map(m => toMessageObj(m));
    
    chatStore.setChatMessages(messages);
    this.chatView.mergeMessages(messages);
  }
  
  async fallbackPollMessages() {
    let data;
    
    try {
      // ew XHR
      data = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.withCredentials = true;
        xhr.responseType = 'json';
        xhr.onload = () => resolve(xhr.response);
        xhr.onerror = () => reject(Error(xhr.statusText));
        xhr.open('GET', '/messages.json')
        xhr.send();
      });
    }
    catch(e) {
      console.log('Message get failed', e);
    }
    
    const messages = data.messages.map(m => toMessageObj(m));
    this.chatView.mergeMessages(messages);
    setTimeout(() => this.fallbackPollMessages(), 10000);
  }

  registerServiceWorker() {
    if (!navigator.serviceWorker) {
      return Promise.reject(Error("Service worker not supported"));
    }
    return navigator.serviceWorker.register('/sw.js');
  }

  async registerPush() {
    if (!navigator.serviceWorker) {
      throw Error("Service worker not supported");
    }
    
    const reg = await navigator.serviceWorker.ready;
    
    if (!reg.pushManager) {
      this.globalWarningView.warn("Your browser doesn't support service workers, so this isn't going to work.");
      throw Error("Push messaging not supported");
    }

    let pushSub;

    try {
      pushSub = await reg.pushManager.subscribe({userVisibleOnly: true});
    }
    catch (err) {
      console.warn("Push subscription failed.");
      throw err;
    }

    // The API was updated to only return an |endpoint|, but Chrome
    // 42 and 43 implemented the older API which provides a separate
    // subscriptionId. Concatenate them for backwards compatibility.
    let endpoint = pushSub.endpoint;
    if ('subscriptionId' in pushSub && !endpoint.includes(pushSub.subscriptionId)) {
      endpoint += "/" + pushSub.subscriptionId;
    }

    const data = new FormData();
    data.append('endpoint', endpoint);

    await fetch('/subscribe', {
      body: data,
      credentials: 'include',
      method: 'POST'
    });
  }

  async logout() {
    const reg = await navigator.serviceWorker.getRegistration('/');
    if (reg) await reg.unregister();
    // TODO: clear data
    window.location.href = this.logoutEl.href;
  }
}

new MainController();
