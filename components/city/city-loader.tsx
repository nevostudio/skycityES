"use client";
import dynamic from "next/dynamic";
import { Component, type ComponentProps, type ReactNode } from "react";
const CityScene = dynamic(() => import("./city-scene"), {
  ssr: false,
  loading: () => (
    <div className="city-loading">
      <span className="loader" />
      <p>Una ciudad pequeña. Posibilidades infinitas.</p>
      <small>Abriendo SkyCity…</small>
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
        <p>Tu navegador no ha podido abrir la ciudad en 3D.</p>
        <small>
          Usa el directorio de solares para explorar toda la ciudad.
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
