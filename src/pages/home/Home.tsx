import { useEffect, useRef, useState } from 'react';
import { Tabs } from 'radix-ui';
import catalog from '../../entities/gift/catalog.json';
import { eventCountdown } from '../../entities/event/countdown';
import { GiftCard } from '../../features/give-gift/GiftCard';
import { Form } from '../../features/respond/Form';
import { Button } from '../../shared/ui/button';
import { Icon } from '../../shared/ui/icon';

const sections = [
  { id: 'inicio', label: 'Início', icon: 'home' },
  { id: 'presentes', label: 'Presentes', icon: 'gift' },
  { id: 'presenca', label: 'Presença', icon: 'calendar' },
  { id: 'recados', label: 'Recados', icon: 'message' },
] as const;
const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(catalog.event.location)}`;
const sectionFromHash = () => sections.find(section => `#${section.id}` === window.location.hash)?.id ?? 'inicio';

export function Home() {
  const [section, setSection] = useState<string>(sectionFromHash);
  const [showMobileHeader, setShowMobileHeader] = useState(false);
  const sidebar = useRef<HTMLElement>(null);
  const content = useRef<HTMLElement>(null);
  const countdown = eventCountdown(catalog.event.eventDate);
  const scrollToContent = () => content.current?.scrollIntoView({ block: 'start', behavior: 'instant' });

  useEffect(() => {
    function navigate() {
      setSection(sectionFromHash());
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
      <a className="skip-link" href="#conteudo" onClick={event => { event.preventDefault(); content.current?.focus(); scrollToContent(); }}>Pular para o conteúdo</a>
      <header className={`mobile-header${showMobileHeader ? ' is-visible' : ''}`} inert={!showMobileHeader}>
        <span className="event-avatar" aria-hidden="true">R</span>
        <a href="#inicio"><strong>República da Brisinha</strong><span>sábado, 19 de dezembro · 15h</span></a>
      </header>
      <div className="event-layout">
        <aside className="event-sidebar" aria-label="Sobre o evento" ref={sidebar}>
          {countdown && <p className="event-countdown"><span aria-hidden="true" />{countdown}</p>}
          <h1>{catalog.event.title}</h1>
          <p className="event-type">Chá de Panela</p>
          <ul className="event-facts">
            <li><Icon name="calendar" /><span>sábado, 19 de dezembro · 15h</span></li>
            <li><Icon name="pin" /><span>{catalog.event.location}</span></li>
          </ul>
          <div className="event-actions">
            <Button asChild><a href="#presenca" onClick={scrollToContent}><Icon name="calendar" />Confirmar presença</a></Button>
            <Button variant="outline" asChild><a href="#presentes" onClick={scrollToContent}><Icon name="list" />Ver lista de presentes</a></Button>
          </div>
          <nav className="event-shortcuts" aria-label="Atalhos">
            <a href="#presenca" onClick={scrollToContent}><Icon name="calendar" />Presença</a>
            <a href="#presentes" onClick={scrollToContent}><Icon name="gift" />Presentes</a>
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer"><Icon name="pin" />Como chegar<span className="sr-only"> (abre em outra aba)</span></a>
            <a href="#recados" onClick={scrollToContent}><Icon name="message" />Recados</a>
          </nav>
        </aside>
        <div className="event-content">
          <Tabs.Root value={section} onValueChange={value => { window.location.hash = value; }}>
            <div className="section-navigation">
              <Tabs.List className="section-tabs" aria-label="Seções da página">
                {sections.map(item => (
                  <Tabs.Trigger value={item.id} key={item.id} className="section-tab" onClick={scrollToContent}>
                    <span><Icon name={item.icon} /></span>{item.label}
                  </Tabs.Trigger>
                ))}
              </Tabs.List>
            </div>
            <main className="page-content" id="conteudo" ref={content} tabIndex={-1}>
              <Tabs.Content value="inicio" className="home-panel">
                <h2 className="sr-only">Início</h2>
                <div className="surface welcome-card">
                  <p className="eyebrow">um recado de quem convida</p>
                  <p className="welcome-message">{catalog.event.welcomeMessage}</p>
                  <p className="welcome-description">{catalog.event.description}</p>
                </div>
                <section aria-labelledby="destaques-titulo">
                  <div className="section-heading">
                    <h2 id="destaques-titulo">Para presentear</h2>
                    <a href="#presentes">Ver lista completa</a>
                  </div>
                  <div className="featured-gifts">
                    {catalog.items.slice(0, 3).map(gift => <GiftCard gift={gift} key={gift.id} />)}
                  </div>
                </section>
                <section className="surface information-card" aria-labelledby="informacoes-titulo">
                  <h2 id="informacoes-titulo">Informações</h2>
                  <dl>
                    <div><dt className="eyebrow">Quando</dt><dd>Sábado, 19 de dezembro de 2026, às 15h</dd></div>
                    <div>
                      <dt className="eyebrow">Onde</dt><dd>{catalog.event.location}
                        <a className="maps-link" href={mapsUrl} target="_blank" rel="noopener noreferrer"><Icon name="pin" />Como chegar<Icon name="arrow" /><span className="sr-only"> (abre em outra aba)</span></a>
                      </dd>
                    </div>
                  </dl>
                </section>
              </Tabs.Content>
              <Tabs.Content value="presentes" className="catalog-panel">
                <h2>Lista de presentes</h2>
                <div className="catalog-filter"><span>Todos ({catalog.items.length})</span></div>
                <p className="catalog-note">Presentes simbólicos. Sua contribuição vai diretamente para nós.</p>
                <div className="gift-grid">
                  {catalog.items.map(gift => <GiftCard gift={gift} key={gift.id} />)}
                </div>
              </Tabs.Content>
              <Tabs.Content value="presenca" className="rsvp-panel">
                <p className="eyebrow">confirmação de presença</p>
                <h2>Você vem?</h2>
                <p className="section-description">Sábado, 19 de dezembro, às 15h. Sua resposta ajuda a organizar a festa.</p>
                <Form rsvp />
              </Tabs.Content>
              <Tabs.Content value="recados" className="messages-panel">
                <h2>Recados</h2>
                <div className="surface message-card">
                  <p className="section-description">Deixe uma mensagem de carinho para quem está celebrando.</p>
                  <Form />
                </div>
              </Tabs.Content>
            </main>
          </Tabs.Root>
          <footer className="event-footer"><p>República da Brisinha</p><span>Vida longa à República da Brisinha! 🌿🐾</span></footer>
        </div>
      </div>
    </>
  );
}
