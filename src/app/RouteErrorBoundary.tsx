import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  resetKey: string;
}

interface State {
  failed: boolean;
}

export class RouteErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Route render failed", error, info.componentStack);
  }

  componentDidUpdate(previous: Props): void {
    if (previous.resetKey !== this.props.resetKey && this.state.failed) {
      this.setState({ failed: false });
    }
  }

  render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    return (
      <section className="route-state panel" role="alert">
        <h1>This view could not be loaded.</h1>
        <p className="description">Your navigation and saved study data are still available.</p>
        <button type="button" className="primary" onClick={() => window.location.reload()}>
          RELOAD VIEW
        </button>
      </section>
    );
  }
}
