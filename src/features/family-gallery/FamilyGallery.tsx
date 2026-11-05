import { Dialog } from 'radix-ui';
import photos from '../../entities/family-photo/photos.json';
import { copy } from '../../shared/i18n/copy';
import type { Locale } from '../../shared/i18n/locale';

function FamilyPhoto({ photo, locale }: { photo: typeof photos[number]; locale: Locale }) {
  const c = copy[locale];
  const label = photo.alt[locale];

  return <Dialog.Root>
    <Dialog.Trigger asChild>
      <button className="family-photo" aria-label={`${c.openPhoto}: ${label}`}>
        <img src={`${import.meta.env.BASE_URL}${photo.thumbnail}`} alt={photo.alt[locale]} width={photo.width} height={photo.height} loading="lazy" decoding="async" />
      </button>
    </Dialog.Trigger>
    <Dialog.Portal>
      <Dialog.Overlay className="dialog-overlay" />
      <Dialog.Content className="photo-dialog" aria-describedby={undefined}>
        <Dialog.Title className="sr-only">{label}</Dialog.Title>
        <Dialog.Close asChild>
          <button className="photo-dismiss" aria-label={c.close}>
            <img className="photo-full" src={`${import.meta.env.BASE_URL}${photo.full}`} alt={photo.alt[locale]} />
          </button>
        </Dialog.Close>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}

export function FamilyGallery({ locale }: { locale: Locale }) {
  return <section className="family-panel" aria-labelledby="family-title">
    <h2 id="family-title" className="page-title">{copy[locale].familyPictures}</h2>
    <div className="family-gallery">
      {photos.map(photo => <FamilyPhoto key={photo.file} photo={photo} locale={locale} />)}
    </div>
  </section>;
}
