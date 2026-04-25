import type { CSSProperties, HTMLAttributes, ReactNode } from "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": HTMLAttributes<HTMLElement> & {
        alt?: string;
        ar?: boolean;
        autoplay?: boolean;
        children?: ReactNode;
        className?: string;
        exposure?: string;
        "camera-controls"?: boolean;
        "camera-orbit"?: string;
        "environment-image"?: string;
        "field-of-view"?: string;
        "interaction-prompt"?: string;
        "max-camera-orbit"?: string;
        "min-camera-orbit"?: string;
        poster?: string;
        src: string;
        style?: CSSProperties;
        "shadow-intensity"?: string;
      };
    }
  }
}

export {};
