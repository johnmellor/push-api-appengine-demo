import EventEmitter from "events";
import keyboardTemplate from "./templates/keyboard.hbs";
import emoji from "./conf/emoji";

export default class MessageInput extends EventEmitter {
  constructor(el) {
    super();
    this.container = el;
    this.form = el.querySelector('.message-form');
    
    this.container.addEventListener('submit', event => {
      event.preventDefault();
      this._onSubmit();
    });

    this.container.addEventListener('click', e => this._onContainerClick(e));
    this._initKeyboard();
  }

  _onContainerClick(event) {
    if (this.container.classList.contains('active')) return;
    this.container.classList.add('active');
    this.emit('keyboardopen');

    let outCheck = event => {
      if (event.target.closest('.message-input')) return;
      this.container.classList.add('exiting');

      this.container.animate([
        {transform: 'translateY(' + (-this.keyboard.offsetHeight) + 'px)'},
        {transform: 'none'}
      ], {
        duration: 200,
        easing: 'ease-out'
      }).onfinish = _ => {
        this.container.classList.remove('active');
        this.container.classList.remove('exiting');
      };

      document.removeEventListener('click', outCheck);
    };

    // TODO: can this be added so it doesn't pick up this event?
    document.addEventListener('click', outCheck);

    this.container.animate([
      {transform: 'translateY(' + this.keyboard.offsetHeight + 'px)'},
      {transform: 'none'}
    ], {
      duration: 200,
      easing: 'ease-out'
    }).onfinish = _ => {
      this.keys.classList.add('render-all');
    };
  }

  _initKeyboard() {
    // build the keyboard
    this.keyboard = this.container.querySelector('.keyboard');
    this.keyboard.innerHTML = keyboardTemplate({emoji});
    this.keys = this.container.querySelector('.keys');

    // events
    this.container.querySelector('.categories').addEventListener('click', e => this._onCategoryClick(e));
    this.keys.addEventListener('click', e => this._onEmojiKeyClick(e));
    this.container.querySelector('.space button').addEventListener('click', e => this._onSpaceClick(e));
    this.container.querySelector('.del').addEventListener('click', e => this._onDelClick(e));
    document.addEventListener('keydown', e => this._onKeyDown(e));

    // events for mouse/touchstart effect
    this._initButtonActiveStyle(this.keyboard);
  }

  _initButtonActiveStyle(el) {
    let activeEl;

    let end = event => {
      if (!activeEl) return;
      activeEl.classList.remove('active');
      document.removeEventListener('mouseup', end);
      activeEl = undefined;
    };

    let start = event => {
      let button = event.target.closest('button');
      if (!button) return;
      activeEl = button;
      activeEl.classList.add('active');
      document.addEventListener('mouseup', end);
    };

    el.addEventListener('touchstart', start);
    el.addEventListener('mousedown', start);
    el.addEventListener('touchend', end);
  }

  _addToInput(val) {
    this.form.message.value += val;
    this.form.message.scrollLeft = this.form.message.scrollWidth;
  }

  _del() {
    this.form.message.value = [...this.form.message.value].slice(0, -1).join('');
  }

  _onKeyDown(event) {
    if (!this.container.classList.contains('active')) return;
    if (event.keyCode == 8) { // backspace
      event.preventDefault();
      this._del();
    }
    else if (event.keyCode == 13) { // enter
      event.preventDefault();
      this._onSubmit();
    }
    else if (event.keyCode == 32) { // space
      event.preventDefault();
      this._addToInput(' ');
    }
    else if (event.keyCode >= 48 && event.keyCode <= 90) {
      let allKeys = this.keys.querySelectorAll('button');
      this._addToInput(allKeys[Math.round(Math.random() * allKeys.length)].textContent);
    }
  }

  _onDelClick(event) {
    let button = event.currentTarget;
    this._del();
    button.blur();
    event.preventDefault();
  }

  _onSpaceClick(event) {
    let button = event.currentTarget;
    this._addToInput(' ');
    button.blur();
    event.preventDefault();
  }

  _onEmojiKeyClick(event) {
    let button = event.target.closest('button');
    if (!button) return;
    this._addToInput(button.textContent);
    button.blur();
    event.preventDefault();
  }

  _onCategoryClick(event) {
    let button = event.target.closest('button');
    if (!button) return;

    let firstInCategory = this.keys.querySelector('.' + button.getAttribute('data-target'));
    this.keys.scrollLeft = firstInCategory.offsetLeft;
    button.blur();
    event.preventDefault();
  }

  _onSubmit() {
    this.emit('sendmessage', {message: this.form.message.value});
  }

  resetInput() {
    this.form.message.value = '';
  }

  inputFocused() {
    return this.form.message.matches(':focus');
  }

  inputIsEmpty() {
    return !this.form.message.value;
  }
}
