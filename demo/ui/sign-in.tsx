import { useState } from 'react';
import { RiAppleFill, RiGithubFill, RiGoogleFill } from '@remixicon/react';
import { cx } from './cx';
import { Button } from './button';
import { flow } from './events';
import { Checkbox, Input } from './fields';

const PROVIDERS = {
  google: [RiGoogleFill, 'Google'],
  apple: [RiAppleFill, 'Apple'],
  github: [RiGithubFill, 'GitHub'],
} as const;

/** A sign in or sign up card: social providers, email and password. */
export function SignInCard({
  mode,
  layout = 'stacked',
  providers,
  description,
}: {
  mode: 'signin' | 'signup';
  layout?: 'stacked' | 'grid';
  providers: (keyof typeof PROVIDERS)[];
  description?: string;
}) {
  const [remember, setRemember] = useState(true);
  return (
    <div className="flex w-full flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-title-1-semibold text-text-primary">
          {mode === 'signin' ? 'Welcome back' : 'Create your account'}
        </h1>
        <p className="text-body-2-regular text-text-tertiary">
          {description ?? 'Sign in to continue where you left off.'}
        </p>
      </div>
      <div className={cx('gap-2', layout === 'grid' ? 'grid grid-cols-3' : 'flex flex-col')}>
        {providers.map((id) => {
          const [Glyph, name] = PROVIDERS[id];
          return (
            <Button key={id} variant="secondary" leadingIcon={Glyph} onClick={flow(1)}>
              {layout === 'grid' ? name : `Continue with ${name}`}
            </Button>
          );
        })}
      </div>
      <div className="flex items-center gap-3 text-caption-1-regular text-text-tertiary">
        <span className="h-px flex-1 bg-border-button-default" />
        or
        <span className="h-px flex-1 bg-border-button-default" />
      </div>
      <Input label="Email" placeholder="you@company.com" type="email" />
      <Input label="Password" placeholder="At least 8 characters" type="password" />
      {mode === 'signin' && (
        <Checkbox isSelected={remember} onChange={setRemember}>
          Keep me signed in
        </Checkbox>
      )}
      <Button onClick={flow(1)}>{mode === 'signin' ? 'Sign in' : 'Create account'}</Button>
    </div>
  );
}
