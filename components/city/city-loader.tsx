"use client";
import dynamic from "next/dynamic";
import { Component, type ComponentProps, type ReactNode } from "react";
const CityScene = dynamic(() => import("./city-scene"), {
  ssr: false,
  loading: () => (
    <div className="city-loading">
      <span className="loader" />
      <p>A little city. Endless possibilities.</p>
      <small>Opening SkyCity…</small>
    </div>
  ),
});
class SceneBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="city-loading">
        <p>Your browser couldn’t open the 3D city.</p>
        <small>
          Use the Building directory below to explore every property.
        </small>
      </div>
    ) : (
      this.props.children
    );
  }
}
export default function CityLoader(props: ComponentProps<typeof CityScene>) {
  return (
    <SceneBoundary>
      <CityScene {...props} />
    </SceneBoundary>
  );
}
