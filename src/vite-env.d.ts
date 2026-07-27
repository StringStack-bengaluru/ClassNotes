/// <reference types="vite/client" />

declare module 'react-pageflip' {
  import type { ReactNode, RefObject } from 'react';

  export interface FlipBookProps {
    width: number;
    height: number;
    size?: 'fixed' | 'stretch';
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;
    drawShadow?: boolean;
    flippingTime?: number;
    usePortrait?: boolean;
    startPage?: number;
    autoSize?: boolean;
    maxShadowOpacity?: number;
    showCover?: boolean;
    mobileScrollSupport?: boolean;
    clickEventForward?: boolean;
    useMouseEvents?: boolean;
    swipeDistance?: number;
    showPageCorners?: boolean;
    disableFlipByClick?: boolean;
    className?: string;
    style?: React.CSSProperties;
    children: ReactNode;
    onFlip?: (e: { data: number }) => void;
    onChangeOrientation?: (e: { data: string }) => void;
    onChangeState?: (e: { data: string }) => void;
    ref?: RefObject<FlipBookRef | null>;
  }

  export interface FlipBookRef {
    pageFlip: () => {
      flip: (page: number) => void;
      flipNext: () => void;
      flipPrev: () => void;
      turnToPage: (page: number) => void;
      turnToNextPage: () => void;
      turnToPrevPage: () => void;
      getPageCount: () => number;
      getCurrentPageIndex: () => number;
    };
  }

  const HTMLFlipBook: React.ForwardRefExoticComponent<
    FlipBookProps & React.RefAttributes<FlipBookRef>
  >;
  export default HTMLFlipBook;
}
