import {
  type MouseEvent,
  type ReactNode,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from 'react';
import { RiCheckboxCircleFill } from '@remixicon/react';

/** Bubbles up to the demo, which moves the camera to the next (1) or previous (-1) screen. */
export const FLOW_EVENT = 'demo:flow';

const TOAST_EVENT = 'demo:toast';

export const flow = (step: 1 | -1) => (event: MouseEvent<HTMLElement>) =>
  event.currentTarget.dispatchEvent(new CustomEvent(FLOW_EVENT, { bubbles: true, detail: step }));

/** Shows `text` in the toast of the screen `from` sits in. */
export const toast = (from: EventTarget, text: string) =>
  from.dispatchEvent(new CustomEvent(TOAST_EVENT, { bubbles: true, detail: text }));

/**
 * Toasts for the element `ref` goes on: the ones raised inside it show along its bottom edge,
 * which needs it positioned. A hook rather than a wrapper, so pickers see no extra component.
 */
export function useToasts(): [RefObject<HTMLDivElement | null>, ReactNode] {
  const root = useRef<HTMLDivElement>(null);
  const [text, setText] = useState<{ value: string; id: number } | null>(null);
  useEffect(() => {
    const host = root.current;
    if (!host) return;
    const show = (event: Event) => {
      event.stopPropagation();
      setText({ value: (event as CustomEvent<string>).detail, id: performance.now() });
    };
    host.addEventListener(TOAST_EVENT, show);
    return () => host.removeEventListener(TOAST_EVENT, show);
  }, []);
  useEffect(() => {
    if (!text) return;
    const timer = setTimeout(() => setText(null), 2200);
    return () => clearTimeout(timer);
  }, [text]);
  const view = text && (
    <div
      role="status"
      className="pointer-events-none absolute inset-x-0 bottom-8 z-40 flex justify-center"
    >
      <span className="flex items-center gap-2 rounded-full bg-text-primary px-4 py-2.5 text-body-2-medium text-background-primary-default shadow-lg">
        <RiCheckboxCircleFill className="size-[18px]" />
        {text.value}
      </span>
    </div>
  );
  return [root, view];
}
