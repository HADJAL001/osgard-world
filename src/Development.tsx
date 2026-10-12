import { ArrowDown, ArrowUpRight, Check, Layers3, Rocket, ShieldCheck, Timer } from 'lucide-react'

type Locale = 'ru' | 'en'
type Props = { locale: Locale, botUrl: string }

const projects = [
  ['OSGARD WORLD', 'osgard.world', 'Ecosystem', 'Экосистема из связанных цифровых продуктов.', '7 модулей'],
  ['GARD VPN', 'gardvpn.is', 'VPN', 'Приватная сеть и защищённое подключение.', 'VPN-сервис'],
  ['SENJOR', 'senjorio.com', 'Mobility', 'Премиальная мобильность и сервис маршрутов.', 'Премиальное такси'],
  ['OSGARD BUSINESS', 'osgardos.com', 'Business platform', 'Контур цифр, процессов и решений.', 'Развитие бизнеса'],
  ['SUPER DAY', 'superday.run', 'Planner', 'Планирование времени и личного фокуса.', 'Карта и планировщик'],
  ['NEW WORLD', 'osgardnewworld.com', 'App platform', 'Пространство от идеи до цифрового продукта.', 'Цифровые продукты'],
  ['O2 SYSTEM', 'o2system.art', 'Accounting', 'Учёт, созданный для точности.', 'Учёт кассы'],
  ['VANGUARD STUDIO', 'osgardvanguard.studio', 'AI studio', 'Инструменты для создания рекламного видео.', 'Создание видео'],
  ['SkillCred', 'osgard.world/skillcred/', 'Trust infrastructure', 'Переносимые цифровые подтверждения навыков с проверяемой подписью.', 'Ed25519 · Apache-2.0'],
  ['GG EMPIRE', 'gold-glamour.online', 'Private commerce', 'Премиальная цифровая витрина и личный сервис.', 'Private service'],
]

const prices = [
  { name: 'BASIC', price: '25 000 ₽', time: '3 дня', saving: 'Для первого запуска', items: ['Лендинг на одной странице', 'Адаптация для мобильных', 'Форма заявки', 'Домен и хостинг на первый год'] },
  { name: 'STANDARD', price: '50 000 ₽', time: '5 дней', saving: 'Для сайта или Telegram-бота', items: ['Сайт на 5-10 страниц или Telegram-бот', 'Приём заявок и базовая CRM', 'SEO-основа и аналитика', 'Подготовка к запуску'] },
  { name: 'PREMIUM', price: '150 000 ₽', time: '7 дней', saving: 'Для рабочего MVP', featured: true, items: ['Mini App или MVP-платформа', 'Личный кабинет, база данных, API', 'Индивидуальный интерфейс', 'Деплой и передача проекта'] },
  { name: 'EXCLUSIVE', price: '500 000 ₽', time: 'от 14 дней', saving: 'Для сложной платформы', items: ['Мобильное приложение или сложная платформа', 'Полный цикл от дизайна до запуска', 'Интеграции и инфраструктура', 'Три месяца технической поддержки'] },
]

export function Development({ locale, botUrl }: Props) {
  const ru = locale === 'ru'
  const order = ru ? 'Заказать проект' : 'Start a project'
  return <section className="development" id="development">
    <div className="development-hero">
      <div>
        <p className="eyebrow">OSGARD / DEVELOPMENT / 2026</p>
        <h2>{ru ? 'Любой цифровой продукт. За 3-7 дней.' : 'Any digital product. In 3-7 days.'}</h2>
        <p>{ru ? 'Сайты, Telegram-боты, Mini Apps, мобильные приложения и платформы. Современный стек разработки и прозрачный путь от задачи до запуска.' : 'Sites, Telegram bots, Mini Apps, mobile applications and platforms. A modern development stack and a clear route from brief to launch.'}</p>
        <div className="development-actions"><a className="cta" href={botUrl} target="_blank" rel="noreferrer">{order}<ArrowUpRight /></a><button className="development-quiet" onClick={() => document.getElementById('development-portfolio')?.scrollIntoView({ behavior: 'smooth' })}>{ru ? 'Смотреть портфолио' : 'View portfolio'}<ArrowDown /></button></div>
        <small>{ru ? 'Срок и состав работ фиксируются до старта.' : 'Scope and delivery dates are confirmed before work begins.'}</small>
      </div>
      <div className="development-object" aria-hidden="true"><span>DEV</span><i/><b>01</b><em>BUILD / SHIP / SUPPORT</em></div>
    </div>

    <div className="development-portfolio" id="development-portfolio"><div className="development-heading"><p className="eyebrow">SELECTED WORK</p><h3>{ru ? 'Проекты, которые уже работают.' : 'Projects already in operation.'}</h3></div><div className="portfolio-rail">{projects.map(([name, url, category, description, result], index) => <a href={`https://${url}`} target="_blank" rel="noreferrer" className="portfolio-card" key={url}><div className={`portfolio-preview preview-${index % 5}`}><span>{name.split(' ').map(word => word[0]).join('').slice(0, 3)}</span><i>{String(index + 1).padStart(2, '0')}</i></div><small>{category}</small><b>{name}</b><p>{ru ? description : `${category} product built for a focused workflow.`}</p><strong className="project-result">{result}</strong><em>{ru ? 'Открыть' : 'Open'} <ArrowUpRight /></em></a>)}</div></div>

    <div className="development-pricing"><div className="development-heading"><p className="eyebrow">SCOPE / DELIVERY</p><h3>{ru ? 'Что мы делаем. И сколько это стоит.' : 'What we build. And what it costs.'}</h3></div><div className="pricing-grid">{prices.map(plan => <article className={`price-card${plan.featured ? ' is-featured' : ''}`} key={plan.name}>{plan.featured && <span className="price-note">{ru ? 'Рекомендуем' : 'Recommended'}</span>}<p>{plan.name}</p><strong>{plan.price}</strong><small>{ru ? `Срок: ${plan.time}` : `Delivery: ${plan.time}`}</small><em className="price-saving">{plan.saving}</em><ul>{plan.items.map(item => <li key={item}><Check />{item}</li>)}</ul><a href={botUrl} target="_blank" rel="noreferrer">{plan.name === 'EXCLUSIVE' && ru ? 'Обсудить индивидуально' : ru ? 'Обсудить задачу' : 'Discuss your brief'}<ArrowUpRight /></a></article>)}</div></div>

    <div className="development-process"><div className="development-heading"><p className="eyebrow">WORKFLOW</p><h3>{ru ? 'От идеи до запуска - четыре шага.' : 'From idea to launch in four steps.'}</h3></div><ol>{[[Timer, ru ? 'Обсуждаем задачу' : 'Discuss the brief', ru ? '15 минут в Telegram, чтобы зафиксировать цель и объём.' : '15 minutes in Telegram to establish the goal and scope.'], [Layers3, ru ? 'Фиксируем план' : 'Confirm the plan', ru ? 'Согласуем состав работ, срок и этапы оплаты.' : 'We agree on scope, timing and payment stages.'], [Rocket, ru ? 'Собираем и показываем' : 'Build and review', ru ? 'Вы видите результат по мере готовности, без ожидания финала.' : 'You review progress as it is ready, not only at the end.'], [ShieldCheck, ru ? 'Запускаем и поддерживаем' : 'Launch and support', ru ? 'Передаём доступы и остаёмся на связи после запуска.' : 'We hand over access and remain available after launch.']].map(([Icon, title, text], index) => { const StepIcon = Icon as typeof Timer; return <li key={title as string}><i>{String(index + 1).padStart(2, '0')}</i><StepIcon /><div><b>{title as string}</b><p>{text as string}</p></div></li> })}</ol></div>

    <div className="development-benefits"><div className="development-heading"><p className="eyebrow">WHY OSGARD DEVELOPMENT</p><h3>{ru ? 'Работа без лишней прослойки.' : 'Work without unnecessary layers.'}</h3></div><div>{[[Timer, ru ? 'Скорость' : 'Speed', ru ? 'Короткие циклы и ясный процесс вместо многонедельных согласований.' : 'Short cycles and a clear process instead of weeks of coordination.'], [Layers3, ru ? 'Прямой контур' : 'Direct delivery', ru ? 'Задача, дизайн, разработка и запуск собраны в одной команде.' : 'Brief, design, development and launch are handled in one team.'], [ShieldCheck, ru ? 'Качество' : 'Quality', ru ? 'Чистый интерфейс, адаптивность и техническая основа для дальнейшего роста.' : 'A clean interface, responsive implementation and a foundation for future growth.']].map(([Icon, title, text]) => { const BenefitIcon = Icon as typeof Timer; return <article key={title as string}><BenefitIcon /><h4>{title as string}</h4><p>{text as string}</p></article> })}</div></div>

    <div className="development-final"><p className="eyebrow">OSGARD / DEVELOPMENT</p><h3>{ru ? 'Ваш проект начинается с одного сообщения.' : 'Your project begins with one message.'}</h3><p>{ru ? 'Опишите задачу в Telegram. В ответ получите предварительную оценку формата, срока и следующего шага.' : 'Describe your brief in Telegram. You will receive a preliminary scope, timeframe and next step.'}</p><a className="cta large" href={botUrl} target="_blank" rel="noreferrer">{ru ? 'Заказать в Telegram' : 'Start in Telegram'}<ArrowUpRight /></a><div className="development-contact-links"><a href="mailto:osman.osmanov0099@gmail.com">osman.osmanov0099@gmail.com</a><a href="https://wa.me/79640027222" target="_blank" rel="noopener noreferrer">WhatsApp ↗</a></div><small>{ru ? 'Договор - поэтапная оплата - поддержка после запуска' : 'Agreement - staged payment - post-launch support'}</small></div>
  </section>
}
