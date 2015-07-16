import "babelify/node_modules/babel-core/node_modules/regenerator/runtime";
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
    this.messageInputView = new MessageInputView($('.message-form'));
    this.logoutEl = $('.logout');
    this.serviceWorkerReg = this.registerServiceWorker();
    this.pushSubscription = this.registerPush();

    // events
    this.logoutEl.addEventListener('click', event => {
      event.preventDefault();
      this.logout();
    });

    window.addEventListener('message', event => { // non-standard Chrome behaviour
      if (event.origin && event.origin != location.origin) return;
      this.onServiceWorkerMessage(event.data);
    }); 
    navigator.serviceWorker.addEventListener("message", event => this.onServiceWorkerMessage(event.data));

    this.messageInputView.on('sendmessage', ({message}) => this.onSend(message));

    // init
    this.displayMessages();
  }

  async onServiceWorkerMessage(message) {
    if (message == 'updateMessages') {
      await this.mergeCachedMessages();
    }
    else if ('messageSent' in message) {
      this.chatView.markSent(message.messageSent, {
        newId: message.message.id,
        newDate: message.message.date
      });
    }
    else if ('sendFailed' in message) {
      this.chatView.markFailed(message.sendFailed);
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

    await chatStore.addToOutbox(newMessage);
    this.chatView.addMessage(newMessage);
    
    const reg = await this.serviceWorkerReg;
    reg.active.postMessage('postOutbox');

    /*const data = new FormData();
    data.set('message', message);*/
    /*
    const response = await fetch('/send', {
      method: 'POST',
      body: data,
      credentials: 'include'
    });

    chatStore.removeFromOutbox(tempId);

    if (!response.ok) {
      this.chatView.markFailed(tempId);
      return;
    }

    const sentMessage = toMessageObj(await response.json());
    chatStore.addChatMessage(sentMessage);

    this.chatView.markSent(tempId, {
      newId: sentMessage.id,
      newDate: sentMessage.date
    });*/
  }

  async displayMessages() {
    const dataPromise = fetch('/messages.json', {
      credentials: 'include'
    }).then(r => r.json());

    await this.mergeCachedMessages();
    this.chatView.mergeMessages(await chatStore.getOutbox());
    const messages = (await dataPromise).messages.map(m => toMessageObj(m));

    chatStore.setChatMessages(messages);
    this.chatView.mergeMessages(messages);
  }

  registerServiceWorker() {
    if (!navigator.serviceWorker) {
      this.globalWarningView.warn("Your browser doesn't support service workers, so this isn't going to work.");
      return Promise.reject(Error("Service worker not supported"));
    }
    return navigator.serviceWorker.register('/sw.js');
  }

  async registerPush() {
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