import { useEffect, useRef, useState } from 'react';
import { Tabs } from 'radix-ui';
import catalog from '../../entities/gift/catalog.json';
import { eventCountdown } from '../../entities/event/countdown';
import { GiftCard } from '../../features/give-gift/GiftCard';
import { Form } from '../../features/respond/Form';
import { Button } from '../../shared/ui/button';
import { Icon } from '../../shared/ui/icon';
import { LanguageSwitcher } from '../../features/switch-language/LanguageSwitcher';
import { giftCatalog } from '../../entities/gift/model';
import englishContent from '../../entities/event/content.en.json';
import { copy } from '../../shared/i18n/copy';
import type { Locale } from '../../shared/i18n/locale';

const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(catalog.event.location)}`;

export function Home({ locale = 'pt' }: { locale?: Locale }) {
  const c = copy[locale];
  const international = locale === 'en';
  const items = giftCatalog(locale);
  const showMessages = !international || englishContent.showMessages;
  const sections = [
    { id: 'inicio', label: c.home, icon: 'home' },
    { id: 'presentes', label: c.gifts, icon: 'gift' },
    ...(!international ? [{ id: 'presenca', label: c.attendance, icon: 'calendar' } as const] : []),
    ...(showMessages ? [{ id: 'recados', label: c.messages, icon: 'message' } as const] : []),
  ] as const;
  const sectionFromHash = () => sections.find(item => `#${item.id}` === (typeof window === 'undefined' ? '' : window.location.hash))?.id ?? 'inicio';
  const [section, setSection] = useState<string>(sectionFromHash);
  const [showMobileHeader, setShowMobileHeader] = useState(false);
  const sidebar = useRef<HTMLElement>(null);
  const content = useRef<HTMLElement>(null);
  const countdown = eventCountdown(catalog.event.eventDate);
  const scrollToContent = () => content.current?.scrollIntoView({ block: 'start', behavior: 'instant' });

  useEffect(() => {
    function navigate() {
      const next = sectionFromHash();
      setSection(next);
      if (window.location.hash && window.location.hash !== `#${next}`) history.replaceState(null, '', `#${next}`);
      content.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
    }
    window.addEventListener('hashchange', navigate);
    // Wait for the selected panel to mount before following a shared section link.
    if (window.location.hash) requestAnimationFrame(navigate);
    return () => window.removeEventListener('hashchange', navigate);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setShowMobileHeader(!entry.isIntersecting), { rootMargin: '-64px 0px 0px 0px' });
    if (sidebar.current) observer.observe(sidebar.current);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <a className="skip-link" href="#conteudo" onClick={event => { event.preventDefault(); content.current?.focus(); scrollToContent(); }}>{c.skip}</a>
      <header className={`mobile-header${showMobileHeader ? ' is-visible' : ''}`} inert={!showMobileHeader}>
        <span className="event-avatar" aria-hidden="true">R</span>
        <a href="#inicio"><strong>República da Brisinha</strong><span>{international ? englishContent.subtitle : 'sábado, 19 de dezembro · 15h'}</span></a>
      </header>
      <div className="event-layout">
        <aside className="event-sidebar" aria-label={c.about} ref={sidebar}>
          <LanguageSwitcher locale={locale} hash={`#${section}`} />
          {!international && countdown && <p className="event-countdown"><span aria-hidden="true" />{countdown}</p>}
          <h1>{catalog.event.title}</h1>
          <p className="event-type">{international ? englishContent.subtitle : 'Chá de Panela'}</p>
          {!international && <ul className="event-facts">
            <li><Icon name="calendar" /><span>sábado, 19 de dezembro · 15h</span></li>
            <li><Icon name="pin" /><span>{catalog.event.location}</span></li>
          </ul>}
          <div className="event-actions">
            {!international && <Button asChild><a href="#presenca" onClick={scrollToContent}><Icon name="calendar" />Confirmar presença</a></Button>}
            <Button variant="outline" asChild><a href="#presentes" onClick={scrollToContent}><Icon name="list" />{c.viewGifts}</a></Button>
          </div>
          <nav className={`event-shortcuts${international ? ' international-shortcuts' : ''}`} aria-label={c.shortcuts}>
            {!international && <a href="#presenca" onClick={scrollToContent}><Icon name="calendar" />Presença</a>}
            <a href="#presentes" onClick={scrollToContent}><Icon name="gift" />{c.gifts}</a>
            {!international && <a href={mapsUrl} target="_blank" rel="noopener noreferrer"><Icon name="pin" />Como chegar<span className="sr-only"> (abre em outra aba)</span></a>}
            {showMessages && <a href="#recados" onClick={scrollToContent}><Icon name="message" />{c.messages}</a>}
          </nav>
        </aside>
        <div className="event-content">
          <Tabs.Root value={section} onValueChange={value => { window.location.hash = value; }}>
            <div className="section-navigation">
              <Tabs.List className="section-tabs" aria-label={c.sections}>
                {sections.map(item => (
                  <Tabs.Trigger value={item.id} key={item.id} className="section-tab" onClick={scrollToContent}>
                    <span><Icon name={item.icon} /></span>{item.label}
                  </Tabs.Trigger>
                ))}
              </Tabs.List>
            </div>
            <main className="page-content" id="conteudo" ref={content} tabIndex={-1}>
              <Tabs.Content value="inicio" className="home-panel">
                <h2 className="sr-only">{c.home}</h2>
                <div className="surface welcome-card">
                  <p className="eyebrow">{c.welcomeLabel}</p>
                  <p className="welcome-message">{international ? englishContent.welcomeMessage || 'English welcome message coming soon.' : catalog.event.welcomeMessage}</p>
                  {(!international || englishContent.description) && <p className="welcome-description">{international ? englishContent.description : catalog.event.description}</p>}
                </div>
                {(!international || englishContent.showHighlights) && <section aria-labelledby="destaques-titulo">
                  <div className="section-heading">
                    <h2 id="destaques-titulo">{c.featured}</h2>
                    <a href="#presentes">{c.viewAll}</a>
                  </div>
                  <div className="featured-gifts">
                    {items.slice(0, 3).map(gift => <GiftCard gift={gift} locale={locale} key={gift.id} />)}
                  </div>
                </section>}
                {!international && <section className="surface information-card" aria-labelledby="informacoes-titulo">
                  <h2 id="informacoes-titulo">Informações</h2>
                  <dl>
                    <div><dt className="eyebrow">Quando</dt><dd>Sábado, 19 de dezembro de 2026, às 15h</dd></div>
                    <div>
                      <dt className="eyebrow">Onde</dt><dd>{catalog.event.location}
                        <a className="maps-link" href={mapsUrl} target="_blank" rel="noopener noreferrer"><Icon name="pin" />Como chegar<Icon name="arrow" /><span className="sr-only"> (abre em outra aba)</span></a>
                      </dd>
                    </div>
                  </dl>
                </section>}
              </Tabs.Content>
              <Tabs.Content value="presentes" className="catalog-panel">
                <h2>{c.giftList}</h2>
                <div className="catalog-filter"><span>{c.all} ({items.length})</span></div>
                <p className="catalog-note">{c.giftNote}</p>
                <div className="gift-grid">
                  {items.map(gift => <GiftCard gift={gift} locale={locale} key={gift.id} />)}
                </div>
              </Tabs.Content>
              {!international && <Tabs.Content value="presenca" className="rsvp-panel">
                <p className="eyebrow">confirmação de presença</p>
                <h2>Você vem?</h2>
                <p className="section-description">Sábado, 19 de dezembro, às 15h. Sua resposta ajuda a organizar a festa.</p>
                <Form rsvp />
              </Tabs.Content>}
              {showMessages && <Tabs.Content value="recados" className="messages-panel">
                <h2>{c.messages}</h2>
                <div className="surface message-card">
                  <p className="section-description">{c.messagesDescription}</p>
                  <Form locale={locale} />
                </div>
              </Tabs.Content>}
            </main>
          </Tabs.Root>
          <footer className="event-footer"><p>República da Brisinha</p>{!international && <span>Vida longa à República da Brisinha! 🌿🐾</span>}</footer>
        </div>
      </div>
    </>
  );
}
