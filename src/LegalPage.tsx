import { useEffect } from 'react'
import { ArrowLeft, ArrowUpRight, Mail, MessageCircle, ShieldCheck } from 'lucide-react'
import { OsgardLogo } from './OsgardLogo'
import './games-hub.css'

type LegalKind = 'privacy' | 'terms'

export function LegalPage({ kind }: { kind: LegalKind }) {
  const ru = true
  const privacy = kind === 'privacy'
  useEffect(() => {
    document.title = privacy ? 'Конфиденциальность — OSGARD WORLD' : 'Условия использования — OSGARD WORLD'
    const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    if (meta) meta.content = privacy
      ? 'Информация о локальных игровых настройках, необязательной аналитике и переходах на внешние сайты OSGARD WORLD.'
      : 'Условия использования каталога игр OSGARD WORLD и внешних игровых сервисов.'
    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical) }
    canonical.href = 'https://osgard.world/' + kind
  }, [kind, privacy])

  return <main className="gh-page">
    <header className="gh-header">
      <a className="gh-brand" href="/" aria-label="OSGARD WORLD — главная"><OsgardLogo /></a>
      <nav className="gh-nav" aria-label="Навигация"><a href="/games">Игры</a><a href="/worlds">Миры</a><a href="/development">Разработка</a></nav>
      <a className="gh-contact-link" href="https://wa.me/79640027222" target="_blank" rel="noopener noreferrer"><MessageCircle size={15} />Связаться</a>
    </header>
    <div className="gh-detail-wrap">
      <a className="gh-secondary" href="/games"><ArrowLeft size={15} />Вернуться к играм</a>
      <section className="gh-detail-hero">
        <div className="gh-detail-copy">
          <p className="gh-eyebrow"><ShieldCheck size={14} /> OSGARD WORLD / {privacy ? 'PRIVACY' : 'TERMS'}</p>
          <h1>{privacy ? 'Конфиденциальность.' : 'Условия использования.'}</h1>
          <p className="gh-detail-description">{privacy
            ? 'Эта страница описывает конкретные функции каталога игр OSGARD. Она не подменяет полную политику всех сервисов экосистемы.'
            : 'Эти условия относятся к каталогу игр OSGARD WORLD. Отдельные игры и внешние продукты могут иметь собственные правила.'}</p>
        </div>
        <div className="gh-detail-art" aria-hidden="true"><div className="gh-detail-ring gh-detail-ring-one"/><div className="gh-detail-ring gh-detail-ring-two"/><div className="gh-detail-mark">O</div><span>TRUST / TRANSPARENCY</span><small>OSGARD WORLD</small></div>
      </section>
      {privacy ? <section className="gh-detail-info-grid">
        <article><p className="gh-eyebrow">01 / LOCAL DATA</p><h2>Данные на устройстве</h2><p>Избранное и история недавно открытых игр хранятся локально в браузере для работы каталога. Их можно удалить через настройки или очистив данные сайта в браузере.</p></article>
        <article><p className="gh-eyebrow">02 / OPTIONAL ANALYTICS</p><h2>Необязательная аналитика</h2><p>В новом каталоге игровые события и переходы отправляются через очередь приложения только после явного выбора «Разрешить». Отказ не блокирует каталог. Настройки доступны в нижней части страницы игр.</p></article>
        <article><p className="gh-eyebrow">03 / CONTACT</p><h2>Заявки и контакты</h2><p>Форма каталога открывает подготовленное письмо в почтовом приложении пользователя. Эта форма не сохраняет заявку на сервере. Обработка письма после отправки зависит от почтового провайдера и получателя.</p></article>
        <article><p className="gh-eyebrow">04 / THIRD PARTIES</p><h2>Внешние сервисы</h2><p>При переходе в отдельную игру, WhatsApp, почтовое приложение или внешний сайт действуют условия и настройки соответствующего сервиса. Не передавайте там данные, которые не хотите раскрывать этому сервису.</p></article>
        <article><p className="gh-eyebrow">05 / EXISTING PORTAL</p><h2>Другие разделы</h2><p>В остальной экосистеме могут работать авторизация, игровые сессии и серверная синхронизация. Эти функции требуют отдельного аудита потоков данных; эта страница не утверждает, что глобальный портал уже полностью охвачен единым согласием.</p></article>
        <article><p className="gh-eyebrow">06 / QUESTIONS</p><h2>Связаться по вопросам данных</h2><p>Напишите на email разработчика и укажите раздел и устройство, к которым относится запрос.</p><a className="gh-text-link" href="mailto:osman.osmanov0099@gmail.com"><Mail size={15}/>osman.osmanov0099@gmail.com</a></article>
      </section> : <section className="gh-detail-info-grid">
        <article><p className="gh-eyebrow">01 / ACCESS</p><h2>Доступ к играм</h2><p>Каталог предоставляет ссылки на доступные игровые точки входа. Доступность сетевых режимов, сохранения и серверных функций зависит от самой игры и соответствующего API.</p></article>
        <article><p className="gh-eyebrow">02 / FAIR PLAY</p><h2>Честное использование</h2><p>Не пытайтесь нарушать работу сервиса, обходить ограничения доступа, вмешиваться в серверные запросы, автоматизировать злоупотребления или распространять чужие материалы без разрешения.</p></article>
        <article><p className="gh-eyebrow">03 / PAYMENTS</p><h2>Покупки и реклама</h2><p>В этой версии каталога не подключены платёжный процессор, внутриигровые покупки или рекламная сеть. Не считайте декоративный или спонсорский блок подтверждением оплаты либо рекламного показа.</p></article>
        <article><p className="gh-eyebrow">04 / EXTERNAL SERVICES</p><h2>Внешние сайты</h2><p>Переходы на другие проекты открывают сторонние сайты, которые управляются независимо. Проверяйте их условия и способы связи до предоставления платежных, контактных или иных персональных данных.</p></article>
        <article><p className="gh-eyebrow">05 / AVAILABILITY</p><h2>Изменение доступа</h2><p>Игры могут обновляться, временно становиться недоступными или требовать браузер, сеть либо устройство с поддержкой определённых функций. При ошибке используйте отдельную ссылку запуска и обращайтесь в поддержку.</p></article>
        <article><p className="gh-eyebrow">06 / FEEDBACK</p><h2>Связь с разработчиком</h2><p>Опишите проблему или идею улучшения в письме либо сообщении WhatsApp. Эти условия и политика конфиденциальности являются подготовленным проектом и должны быть проверены ответственным оператором и юристом до объявления полной юридической готовности.</p><div className="gh-contact-options"><a href="mailto:osman.osmanov0099@gmail.com"><Mail size={15}/>Email</a><a href="https://wa.me/79640027222" target="_blank" rel="noopener noreferrer"><MessageCircle size={15}/>WhatsApp<ArrowUpRight size={13}/></a></div></article>
      </section>}
      <p className="gh-play-note">Статус документа: рабочий черновик для каталога игр. Требуется юридическая проверка, указание юридического оператора, применимого права и каналов запросов до публикации как окончательной политики.</p>
    </div>
    <footer className="gh-footer"><a href="/games" className="gh-footer-brand"><OsgardLogo variant="footer" /></a><span>© OSGARD WORLD · PLAY WITH PURPOSE</span><div><a href="/privacy">Конфиденциальность</a><a href="/terms">Условия</a><a href="/games">Игры</a></div></footer>
  </main>
}
