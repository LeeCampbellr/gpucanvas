import { SignInCard } from '../../ui';
import { person } from '../../products';
import { Cover, Logo, type Props } from '../parts';

export function SignIn({ product, seed }: Props) {
  return (
    <div className="grid h-full grid-cols-2">
      <div className="flex flex-col p-10">
        <Logo product={product} />
        <div className="m-auto w-[400px]">
          <SignInCard
            mode={seed % 3 === 0 ? 'signup' : 'signin'}
            layout={seed % 2 ? 'stacked' : 'grid'}
            providers={['google', 'apple', 'github']}
            description={
              seed % 3 === 0 ? `Start with ${product.name} in a couple of minutes.` : undefined
            }
          />
        </div>
      </div>
      <div className="relative m-3 overflow-hidden rounded-3xl">
        <Cover product={product} seed={seed} className="absolute inset-0 size-full" />
        <div className="absolute inset-x-8 bottom-8 rounded-2xl bg-black/35 p-6 text-white backdrop-blur-md">
          <p className="text-title-3-medium">
            "{product.tagline}. We switched our whole team to {product.name} in a week."
          </p>
          <p className="mt-3 text-body-2-regular text-white/80">{person(seed)[0]}</p>
        </div>
      </div>
    </div>
  );
}
