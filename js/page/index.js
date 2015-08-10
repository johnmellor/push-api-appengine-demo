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
    this.messageInputView = new MessageInputView($('.message-input'));
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

    navigator.serviceWorker.addEventListener('controllerchange', _ => this.onServiceWorkerControllerChange());

    this.messageInputView.on('sendmessage', ({message}) => this.onSend(message));
    window.addEventListener('resize', _ => this.onResize());

    // init
    this.displayMessages();
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

    if (reg.sync) {
      await reg.sync.register({tag: 'outbox'});
    }
    else {
      reg.active.postMessage('postOutbox');
    }
  }

  async displayMessages() {
    const dataPromise = fetch('/messages.json', {
      credentials: 'include'
    }).then(r => r.json());

    if (dataPromise.loginUrl) {
      window.location.href = dataPromise.loginUrl;
      return;
    }

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