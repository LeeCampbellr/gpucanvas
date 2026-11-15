import { SignInCard } from '../../ui';
import { Logo, type Props } from '../parts';
import { Phone } from './shell';

export function PhoneSignIn({ product, seed }: Props) {
  return (
    <Phone>
      <div className="flex flex-col items-start gap-6 pt-8">
        <Logo product={product} size="lg" />
        <SignInCard
          mode={seed % 2 ? 'signup' : 'signin'}
          layout="grid"
          providers={['google', 'apple', 'github']}
          description={seed % 2 ? `Start with ${product.name} in a couple of minutes.` : undefined}
        />
      </div>
    </Phone>
  );
}
