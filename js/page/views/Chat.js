import chatItem from "./templates/chatItem.hbs";
import dateFormat from "dateformat";

export default class Chat {
  constructor(container, currentUserId) {
    this.container = container;
    this.timeline = container.querySelector('.chat-timeline');
    this.currentUserId = currentUserId;
    this.range = document.createRange();
    this.range.setStart(this.timeline, 0);
  }

  async performScroll({
    instant = false
  }={}) {
    if (document.fonts) await document.fonts.ready;
    const topPos = this.container.scrollHeight;
    if (instant) {
      this.container.style.scrollBehavior = 'auto';
    }
    this.container.scrollTop = topPos;
    this.container.style.scrollBehavior = '';
  }

  _createElement(message) {
    const data = Object.create(message);
    data.readableDate = dateFormat(message.date, 'mmm d HH:MM');
    data.date = data.date.toISOString();
    data.fromCurrentUser = (data.userId === this.currentUserId);
    return this.range.createContextualFragment(chatItem(data));
  }

  addMessages(messages) {
    const shouldScroll = (this.container.scrollTop + this.container.offsetHeight == this.container.scrollHeight);
    const shouldScrollInstantly = this.timeline.children.length === 0;
    messages.forEach(message => {
      this.timeline.appendChild(this._createElement(message));
    });

    if (shouldScroll) {
      this.performScroll({instant: shouldScrollInstantly});
    }
  }

  addMessage(message) {
    return this.addMessages([message]);
  }

  mergeMessages(messages) {
    const times = Array.from(this.timeline.querySelectorAll('time')).map(t => new Date(t.getAttribute('datetime')));
    let messageIndex = 0;
    let message = messages[messageIndex];
    if (!message) return;

    for (let i = 0; i < times.length; i++) {
      let time = times[i];
      let el = this.timeline.children[i];

      while (message.date.valueOf() <= time.valueOf()) {
        if (message.id !== Number(el.getAttribute('data-id'))) {
          this.timeline.insertBefore(this._createElement(message), el);
        }
        message = messages[++messageIndex];
        if (!message) return;
      }
    }

    this.addMessages(messages.slice(messageIndex));
  }

  markSent(id, {newId, newDate}) {
    const item = this.timeline.querySelector(`.chat-item[data-id='${id}']`);
    if (!item) throw Error('Message not found');

    item.classList.remove('sending');

    if (newId) item.setAttribute('data-id', newId);
    if (newDate) {
      let time = item.querySelector('time');
      time.setAttribute('datetime', newDate.toISOString());
      time.textContent = dateFormat(newDate, 'mmm d HH:MM');
    }
  }

  markFailed(id) {
    const item = this.timeline.querySelector(`.chat-item[data-id='${id}']`);
    item.querySelector('.state').textContent = 'Sending failed';
  }
}