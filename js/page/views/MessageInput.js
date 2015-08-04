import EventEmitter from "events";

export default class MessageInput extends EventEmitter {
  constructor(el) {
    super();
    this.container = el;
    this.container.addEventListener('submit', event => {
      event.preventDefault();
      this._onSubmit();
    });

    // send focus back to text input once clicked
    this.container.querySelector('button[type=submit]').addEventListener('click', _ => {
      this.container.message.focus();
    });
  }

  _onSubmit() {
    this.emit('sendmessage', {message: this.container.message.value});
  }

  resetInput() {
    this.container.message.value = '';
  }

  inputFocused() {
    return this.container.message.matches(':focus');
  }

  inputIsEmpty() {
    return !this.container.message.value;
  }
}
