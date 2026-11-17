import { Component } from "react";

export default class ErrorBoundaryCartDrawer extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    try {
      console.error("Error en CartDrawer:", error);
    } catch {
      // no-op
    }
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}
