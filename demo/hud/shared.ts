/** What every HUD panel shares: the panel look, number formatting and the repository link. */

export const PANEL =
  'rounded-2xl border border-border-button-default bg-background-primary-default shadow-dropdown';

export const format = (value: number) => value.toLocaleString('en-US');

export const REPO = 'https://github.com/berkantay/gpucanvas';
