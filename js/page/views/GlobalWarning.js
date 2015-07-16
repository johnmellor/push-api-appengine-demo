export default class GlobalWarning {
  constructor(el) {
    this.container = el;
  }

  warn(msg) {
    this.container.classList.add('active');
    this.container.textContent = msg;
  }
}