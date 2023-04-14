export default class Style {
  state: Record<string, any> = {};

  assign(style) {
    this.state = {
      ...this.state,
      ...style,
    };
  }

  get() {
    return this.state;
  }
}
