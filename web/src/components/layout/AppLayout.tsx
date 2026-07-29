import { NavLink, Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { GuideWelcome } from '../guide/GuideWelcome';
import { usePreferences } from '../../preferences/PreferencesContext';

const links = [
  { to: '/app', end: true, label: 'Painel', icon: PanelIcon },
  { to: '/app/agenda', label: 'Agendamentos', icon: CalendarIcon },
  { to: '/app/clientes', label: 'Clientes', icon: UsersIcon },
  { to: '/app/comunicacoes', label: 'Comunicações', icon: ChatIcon },
  { to: '/app/servicos', label: 'Serviços', icon: SparkIcon },
  { to: '/app/profissionais', label: 'Profissionais', icon: ScissorsIcon },
  { to: '/app/como-usar', label: 'Como usar', icon: GuideIcon },
  { to: '/app/configuracoes', label: 'Configurações', icon: GearIcon },
];

export function AppLayout() {
  const { user, loading, logout } = useAuth();
  const { sidebar, setSidebar } = usePreferences();
  const isRail = sidebar === 'rail';

  function toggleSidebar() {
    setSidebar(isRail ? 'expanded' : 'rail');
  }

  if (loading) {
    return (
      <main className="main" style={{ display: 'grid', placeItems: 'center' }}>
        <p>Carregando…</p>
      </main>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (user.mustChangePassword) {
    return <Navigate to="/primeiro-acesso" replace />;
  }

  return (
    <div className={`app-shell${isRail ? ' app-shell--rail' : ''}`}>
      <aside className="sidebar" aria-label="Navegação">
        <div className="sidebar__brand">
          <div className="sidebar__logo" aria-hidden>
            <ScissorsIcon />
          </div>
          <div className="sidebar__brand-text">
            <strong>Belle</strong>
            <span>Salão & Barbearia</span>
          </div>
        </div>

        <nav className="sidebar__nav" aria-label="Principal">
          {links.map(({ to, end, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              title={label}
              className={({ isActive }) =>
                `sidebar__link${isActive ? ' is-active' : ''}`
              }
            >
              <Icon />
              <span className="label">{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar__footer">
          <button
            type="button"
            className="sidebar__link sidebar__collapse"
            title={isRail ? 'Expandir menu' : 'Compactar menu'}
            aria-label={isRail ? 'Expandir menu' : 'Compactar menu'}
            aria-pressed={isRail}
            onClick={toggleSidebar}
          >
            {isRail ? <MenuIcon /> : <CollapseArrowIcon />}
          </button>
          <button
            type="button"
            className="sidebar__link sidebar__logout"
            title="Sair"
            onClick={() => void logout()}
          >
            <LogoutIcon />
            <span className="label">Sair</span>
          </button>
        </div>
      </aside>

      <div className="main">
        <GuideWelcome />
        <Outlet />
      </div>
    </div>
  );
}

function PanelIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19c.8-3 2.9-4.5 5.5-4.5S13.7 16 14.5 19" />
      <circle cx="17" cy="9" r="2.4" />
      <path d="M15.2 19c.4-1.7 1.5-2.8 3.3-3.2" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M4 5h16v11H8l-4 3V5z" />
      <path d="M8 10h8M8 13h5" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M12 3l1.4 5.2L18 9.5l-4.6 1.3L12 16l-1.4-5.2L6 9.5l4.6-1.3L12 3z" />
      <path d="M18.5 15l.7 2.3 2.3.7-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7.7-2.3z" />
    </svg>
  );
}

function ScissorsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="6" cy="18" r="2.5" />
      <path d="M8.2 7.8L20 18M8.2 16.2L20 6" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2.2M12 18.8V21M4.9 6.2l1.6 1.6M17.5 16.2l1.6 1.6M3 12h2.2M18.8 12H21M4.9 17.8l1.6-1.6M17.5 7.8l1.6-1.6" />
    </svg>
  );
}

function GuideIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M5 4.5h11a3 3 0 0 1 3 3V20H8a3 3 0 0 0-3 3V4.5z" />
      <path d="M5 4.5A3 3 0 0 1 8 1.5h11" />
      <path d="M9 8h6M9 12h6M9 16h4" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M10 7V5a2 2 0 0 1 2-2h7v18h-7a2 2 0 0 1-2-2v-2" />
      <path d="M4 12h10M10 8l-4 4 4 4" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function CollapseArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}
