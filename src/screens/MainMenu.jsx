import { BoardCorner, CardFan, Dice } from './MainMenuDecor.jsx'
import './MainMenu.css'

function IconCreate() {
  return (
    <svg viewBox="0 0 34 34" aria-hidden="true">
      <rect x="1" y="1" width="32" height="32" rx="6" />
      <path d="M9 17h16M17 9v16" />
    </svg>
  )
}

function IconJoin() {
  return (
    <svg viewBox="0 0 34 34" aria-hidden="true">
      <rect x="1" y="1" width="32" height="32" rx="6" />
      <circle cx="17" cy="17" r="10" />
      <path d="M12 17h10M18 13l4 4-4 4" />
    </svg>
  )
}

function IconProfile() {
  return (
    <svg viewBox="0 0 34 34" aria-hidden="true">
      <rect x="1" y="1" width="32" height="32" rx="6" />
      <circle cx="17" cy="13" r="5" />
      <path d="M8 27a9 9 0 0 1 18 0" />
    </svg>
  )
}

function IconSettings() {
  return (
    <svg viewBox="0 0 34 34" aria-hidden="true">
      <rect x="1" y="1" width="32" height="32" rx="6" />
      <circle cx="17" cy="17" r="7" />
      <circle cx="17" cy="17" r="2.5" />
      <path d="M17 6v3M17 25v3M6 17h3M25 17h3M9.3 9.3l2.1 2.1M22.6 22.6l2.1 2.1M24.7 9.3l-2.1 2.1M11.4 22.6l-2.1 2.1" />
    </svg>
  )
}

const MENU_ITEMS = [
  {
    key: 'create',
    title: 'Crear partida',
    subtitle: 'Crea tu propia partida publica o privada.',
    accent: 'var(--accent-create)',
    Icon: IconCreate,
  },
  {
    key: 'join',
    title: 'Unirse a partida',
    subtitle: 'Únete a una partida existente.',
    accent: 'var(--accent-join)',
    Icon: IconJoin,
  },
  {
    key: 'profile',
    title: 'Perfil',
    subtitle: 'Revisa y personaliza tu perfil.',
    accent: 'var(--accent-profile)',
    Icon: IconProfile,
  },
  {
    key: 'settings',
    title: 'Configuración',
    subtitle: 'Ajusta las preferencias del juego.',
    accent: 'var(--accent-settings)',
    Icon: IconSettings,
  },
]

/* Swallowtail banner from the mockup: a pennant with a notch cut up into it. */
function Emblem() {
  return (
    <span className="mm-emblem">
      <svg viewBox="0 0 100 110" aria-hidden="true">
        <path d="M2 2h96v106L50 85 2 108Z" />
      </svg>
      <span className="mm-emblem__letter">K</span>
    </span>
  )
}

/**
 * The main menu. `player` is placeholder data until auth lands; `onSelect`
 * receives one of the MENU_ITEMS keys and will drive routing in a later slice.
 */
export default function MainMenu({ player = { name: 'Mau', level: 67 }, onSelect }) {
  const select = (key) => () => onSelect?.(key)

  return (
    <div className="mm">
      {/* Placeholder for the medieval backdrop art the mockup calls for. */}
      <div className="mm__backdrop" aria-hidden="true">
        <span className="mm__ridge mm__ridge--far" />
        <span className="mm__ridge mm__ridge--near" />
      </div>

      <div className="mm__frame">
        <header className="mm__header">
          <Emblem />

          <button type="button" className="mm__player" onClick={select('profile')}>
            <span className="mm__avatar" aria-hidden="true" />
            <span className="mm__player-text">
              <span className="mm__player-name">{player.name}</span>
              <span className="mm__player-level">Nivel {player.level}</span>
            </span>
            <svg className="mm__chevron" viewBox="0 0 10 20" aria-hidden="true">
              <path d="M2 7l3 4 3-4" />
            </svg>
          </button>
        </header>

        <div className="mm__hero">
          <h1 className="mm__title">
            KATAN<span className="mm__title-apos">&apos;</span>T
          </h1>
          <span className="mm__rule" aria-hidden="true" />
          <p className="mm__tagline">sIX &amp; sEVEN</p>
        </div>

        <div className="mm__main">
          <nav className="mm__menu" aria-label="Menú principal">
            {MENU_ITEMS.map(({ key, title, subtitle, accent, Icon }) => (
              <button
                key={key}
                type="button"
                className="mm-card"
                style={{ '--accent': accent }}
                onClick={select(key)}
              >
                <span className="mm-card__icon">
                  <Icon />
                </span>
                <span className="mm-card__text">
                  <span className="mm-card__title">{title}</span>
                  <span className="mm-card__subtitle">{subtitle}</span>
                </span>
              </button>
            ))}
          </nav>
        </div>

        <div className="mm__decor" aria-hidden="true">
          <CardFan />
          <Dice />
          <BoardCorner />
        </div>
      </div>
    </div>
  )
}
