import { useState } from 'react';
import { Button, cx, Kbd } from '../ui';
import { SHORTCUTS } from '../shortcuts';
import { PANEL, REPO } from './shared';

const FLAG = 'chrome://flags/#canvas-draw-element';
/** Every iPhone and iPad browser runs on WebKit, which has no HTML-in-Canvas and no flag for it. */
const WEBKIT =
  /iP(hone|ad|od)/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const DISMISSED = 'gpucanvas.flagNotice';

/** For browsers without HTML-in-Canvas: what they are seeing, and how to see the GPU path. */
export function FlagNotice() {
  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem(DISMISSED) !== '1';
    } catch {
      return true;
    }
  });
  const [copied, setCopied] = useState(false);
  if (!open) return null;
  const copy = () =>
    navigator.clipboard?.writeText(FLAG).then(
      () => setCopied(true),
      () => {},
    );
  const close = () => {
    setOpen(false);
    try {
      localStorage.setItem(DISMISSED, '1');
    } catch {
      // It shows again next visit.
    }
  };
  return (
    <div
      className={cx(
        PANEL,
        'fixed top-20 left-4 z-20 w-[min(26rem,calc(100vw-2rem))] max-sm:top-16 max-sm:left-2 p-4 text-body-2-regular text-text-secondary',
      )}
    >
      <div className="text-body-semibold text-text-primary">You are seeing the DOM fallback</div>
      <p className="mt-1">
        {WEBKIT
          ? 'gpucanvas draws with WebGPU and HTML-in-Canvas, which iPhone and iPad browsers do not have yet. This is the plain DOM version. Open the page in Chrome on a computer or Android to see the GPU one.'
          : 'gpucanvas draws with WebGPU and HTML-in-Canvas. Chrome 157 and later on a computer has both on by default, so updating Chrome is usually enough. On other Chromium builds, turn on the flag:'}
      </p>
      {!WEBKIT && (
        <ol className="mt-3 list-decimal space-y-1 ps-5">
          <li>
            Open <code className="text-text-primary">{FLAG}</code>
          </li>
          <li>Set it to Enabled and relaunch Chrome</li>
          <li>Come back to this page</li>
        </ol>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        {!WEBKIT && (
          <Button size="small" onClick={copy}>
            {copied ? 'Copied' : 'Copy flag address'}
          </Button>
        )}
        <Button
          size="small"
          variant="secondary"
          onClick={() => window.open(`${REPO}/releases/latest`, '_blank', 'noreferrer')}
        >
          Watch the film
        </Button>
        <Button size="small" variant="secondary" onClick={close}>
          Hide
        </Button>
      </div>
    </div>
  );
}

export function Hints({ edit }: { edit: boolean }) {
  return (
    <>
      <div
        className={cx(
          PANEL,
          'fixed bottom-2 left-2 z-20 px-3 py-2.5 text-caption-1-regular text-text-secondary sm:hidden',
        )}
      >
        Drag to pan, pinch to zoom{edit ? ', tap to select' : ''}
      </div>
      <div
        className={cx(
          PANEL,
          'fixed bottom-4 left-4 z-20 flex items-center gap-4 px-4 py-2.5 text-body-2-regular text-text-secondary max-sm:hidden',
        )}
      >
        <span className="flex items-center gap-1.5">
          <Kbd>Drag</Kbd> or <Kbd>Scroll</Kbd> to pan
        </span>
        <span className="flex items-center gap-1.5">
          <Kbd>⌘</Kbd>
          <Kbd>Scroll</Kbd> to zoom
        </span>
        {edit ? (
          <>
            <span className="flex items-center gap-1.5">
              <Kbd>Click</Kbd> to select
            </span>
            <span className="flex items-center gap-1.5">
              <Kbd>Double-click</Kbd> to go deeper or type
            </span>
            <span className="flex items-center gap-1.5">
              <Kbd>Drag</Kbd> to move
            </span>
          </>
        ) : (
          <span className="flex items-center gap-1.5">
            <Kbd>Shift</Kbd> click or drag to select
          </span>
        )}
        {Object.values(SHORTCUTS)
          .filter((shortcut) => shortcut.hint)
          .map(({ key, label }) => (
            <span key={key} className="flex items-center gap-1.5">
              <Kbd>{key.toUpperCase()}</Kbd>
              {` ${label}`}
            </span>
          ))}
      </div>
    </>
  );
}
