import chatItem from "./templates/chatItem.hbs";
import dateFormat from "dateformat";

export default class Chat {
  constructor(container) {
    this.container = container;
    this.timeline = container.querySelector('.chat-timeline');
    this.range = document.createRange();
    this.range.setStart(this.timeline, 0);
  }

  async _scrollToBottom({
    instant = true
  }={}) {
    if (document.fonts) await document.fonts.ready;
    const topPos = this.container.scrollHeight;
    if (instant) {
      this.container.scrollTop = topPos;
    }
    else {
      this.container.scrollTo(0, topPos);
    }
  }

  _createElement(message) {
    const data = Object.create(message);
    data.readableDate = dateFormat(message.date, 'mmm d HH:MM');
    data.date = data.date.toISOString();
    return this.range.createContextualFragment(chatItem(data));
  }

  addMessages(messages) {
    messages.forEach(message => {
      this.timeline.appendChild(this._createElement(message));
    });
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
      time.setAttribute('datetime', newDate);
      time.textContent = dateFormat(newDate, 'mmm d HH:MM');
    }
  }

  markFailed(id) {
    const item = this.timeline.querySelector(`.chat-item[data-id='${id}']`);
    item.querySelector('.state').textContent = 'Sending failed';
  }
}