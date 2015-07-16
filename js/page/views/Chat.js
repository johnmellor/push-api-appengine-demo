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

  addMessages(messages) {
    messages = messages.map(m => {
      const message = Object.create(m);
      message.readableDate = dateFormat(message.date, 'mmm d HH:MM');
      return message;
    });

    const frag = this.range.createContextualFragment(
      messages.map(m => chatItem(m)).join("")
    );

    this.timeline.appendChild(frag);
  }

  addMessage(message) {
    return this.addMessages([message]);
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