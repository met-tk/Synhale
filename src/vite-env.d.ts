/// <reference types="vite/client" />

import 'react';

declare module 'react' {
  interface SVGAttributes<T> {
    title?: string;
  }
}
