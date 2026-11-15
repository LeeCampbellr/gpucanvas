/**
 * The demo's single-key shortcuts, for the key handlers and the hints panel. Only the ones with
 * `hint` are listed there; the rest are for people who read the source.
 */
export const SHORTCUTS = {
  fit: { key: 'f', label: 'fit', hint: true },
  bench: { key: 'b', label: 'benchmark', hint: true },
  theme: { key: 't', label: 'switch theme', hint: false },
  snapshot: { key: 's', label: 'save the selected screen as a PNG', hint: false },
  dissolve: { key: 'd', label: 'dissolve the selected screen out and back in', hint: false },
  wipe: { key: 'w', label: 'wipe the selected screen out and back in', hint: false },
} as const;

export type Shortcut = keyof typeof SHORTCUTS;

/** Keys pressed while typing, or while choosing in an open list, belong to that field. */
function isTyping(event: KeyboardEvent) {
  const target = event.target;
  if (!(target instanceof Element)) return false;
  return (
    (target as HTMLElement).isContentEditable === true ||
    target.closest('input, textarea, [role="listbox"]') !== null
  );
}

/** Runs the handler of the shortcut `event` presses, if it has one here. */
export function handleShortcut(
  event: KeyboardEvent,
  handlers: Partial<Record<Shortcut, () => void>>,
) {
  if (event.metaKey || event.ctrlKey || event.altKey || isTyping(event)) return;
  for (const [name, { key }] of Object.entries(SHORTCUTS) as [Shortcut, { key: string }][])
    if (event.key === key) handlers[name]?.();
}
