import "babelify/node_modules/babel-core/node_modules/regenerator/runtime";
import ChatView from "./views/Chat";
import GlobalWarningView from "./views/GlobalWarning";
import MessageInputView from "./views/MessageInput";

const $ = document.querySelector.bind(document);

class MainController {
  constructor() {
    this.chatView = new ChatView($('.chat-content'));
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

    this.messageInputView.on('sendmessage', ({message}) => this.onSend(message));

    // init
    this.fetchMessages();
  }

  async onSend(message) {
    this.messageInputView.resetInput();

    // TODO: add chat to UI
    
    const data = new FormData();
    data.set('message', message);

    const response = await fetch('/send', {
      method: 'POST',
      body: data,
      credentials: 'include'
    });

    if (!response.ok) {
      // TODO
      return;
    }

    const responseData = await response.json();
    console.log(responseData);
    // TODO get guid and assign message as sent?
  }

  async fetchMessages() {
    const data = await fetch('/messages.json', {
      credentials: 'include'
    }).then(r => r.json());

    this.chatView.addMessages(
      data.messages.map(m => ({
        text: m.text,
        date: new Date(m.date),
        userId: m.user,
        id: m.id,
        fromCurrentUser: m.user === userId
      }))
    );
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
      this.globalWarningView.warn("Push subscription failed.");
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