import { useRef, useState } from 'react';
import { RiAddLine } from '@remixicon/react';
import { Button, cx, toast } from '../../ui';
import { Cover, type Props } from '../parts';
import { AppPage } from './shell';

export function Gallery({ product, seed }: Props) {
  const tiles = Array.from({ length: 9 }, (_, i) => i);
  const picker = useRef<HTMLInputElement>(null);
  const [uploads, setUploads] = useState<{ src: string; name: string }[]>([]);
  return (
    <AppPage
      product={product}
      active={2}
      title="Library"
      actions={
        <>
          <input
            ref={picker}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(event) => {
              const files = [...(event.target.files ?? [])];
              if (!files.length) return;
              setUploads((all) =>
                [
                  ...files.map((file) => ({ src: URL.createObjectURL(file), name: file.name })),
                  ...all,
                ].slice(0, tiles.length),
              );
              toast(
                event.target,
                files.length === 1
                  ? `Uploaded ${files[0].name}`
                  : `Uploaded ${files.length} images`,
              );
              event.target.value = '';
            }}
          />
          <Button leadingIcon={RiAddLine} onClick={() => picker.current?.click()}>
            Upload
          </Button>
        </>
      }
    >
      <div className="grid flex-1 grid-cols-4 grid-rows-3 gap-3">
        {tiles.map((i) => (
          <div
            key={i}
            className={cx(
              'group relative overflow-hidden rounded-2xl',
              i === 0 && 'col-span-2 row-span-2',
              i === 5 && 'col-span-2',
            )}
          >
            {uploads[i] ? (
              <img
                src={uploads[i].src}
                alt=""
                className="absolute inset-0 size-full object-cover"
              />
            ) : (
              <Cover product={product} seed={seed + i} className="absolute inset-0 size-full" />
            )}
            <span className="absolute bottom-2 left-2 rounded-lg bg-black/45 px-2 py-1 text-caption-1-medium text-white backdrop-blur">
              {uploads[i]?.name ?? product.entries[(seed + i) % product.entries.length].title}
            </span>
          </div>
        ))}
      </div>
    </AppPage>
  );
}
