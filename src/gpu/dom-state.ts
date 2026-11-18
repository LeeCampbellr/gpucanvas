/**
 * What the browser drops when `root` leaves the document and comes back: focus, the document's
 * text selection and scroll offsets. Returns a function that puts them back, or null when there
 * is nothing to restore.
 *
 * Moving a node between pages with `append` loses all three. Chrome's `moveBefore` keeps them,
 * but a resized node moved with it is left undrawn on its new page, so resizes use `append` and
 * restore the state after.
 */
export function saveDomState(root: HTMLElement): (() => void) | null {
  const active = document.activeElement;
  const focused = active instanceof HTMLElement && root.contains(active) ? active : null;

  // A text field keeps its own selection, which the document reports as a spot in its parent:
  // putting that back would take the caret out of the field.
  const selection = isTextField(focused) ? null : document.getSelection();
  const anchor = selection?.anchorNode;
  const focus = selection?.focusNode;
  const range =
    selection && anchor && focus && root.contains(anchor) && root.contains(focus)
      ? ([anchor, selection.anchorOffset, focus, selection.focusOffset] as const)
      : null;

  const scrolled: [Element, number, number][] = [];
  for (const element of [root, ...root.querySelectorAll('*')]) {
    if (element.scrollTop || element.scrollLeft) {
      scrolled.push([element, element.scrollTop, element.scrollLeft]);
    }
  }

  if (!focused && !range && !scrolled.length) return null;
  return () => {
    for (const [element, top, left] of scrolled) {
      element.scrollTop = top;
      element.scrollLeft = left;
    }
    focused?.focus({ preventScroll: true });
    if (range) selection!.setBaseAndExtent(...range);
  };
}

const isTextField = (element: Element | null) =>
  element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement;
