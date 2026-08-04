import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { api } from '../lib/api';
import {
  formatBrPhone,
  isValidBrPhone,
  phoneDigits,
} from '../lib/phone';
import {
  readLocalSalonSettings,
  settingsFromApi,
  validateWeeklyHours,
  writeLocalSalonSettings,
  type SalonBusinessSettings,
  WEEKDAY_LABELS,
  WEEKDAY_UI_ORDER,
  type WeekdayKey,
} from '../lib/salonSettings';
import { usePreferences } from '../preferences/PreferencesContext';

export function SettingsPage() {
  const { user, setUser } = useAuth();
  const { theme, density, sidebar, setTheme, setDensity, setSidebar } =
    usePreferences();
  const [settings, setSettings] = useState<SalonBusinessSettings>(() =>
    readLocalSalonSettings(),
  );
  const [saved, setSaved] = useState(false);
  const [salonError, setSalonError] = useState<string | null>(null);
  const [savingSalon, setSavingSalon] = useState(false);
  const isAdmin = user?.role === 'ADMIN';

  const [profilePassword, setProfilePassword] = useState('');
  const [name, setName] = useState(user?.name ?? '');
  const [title, setTitle] = useState(user?.title ?? '');
  const [phone, setPhone] = useState(
    user?.phone ? formatBrPhone(user.phone) : '',
  );
  const [profileEmail, setProfileEmail] = useState(user?.email ?? '');
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileOk, setProfileOk] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [email, setEmail] = useState(user?.email ?? '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [credError, setCredError] = useState<string | null>(null);
  const [credOk, setCredOk] = useState(false);
  const [savingCreds, setSavingCreds] = useState(false);

  useEffect(() => {
    setSettings(readLocalSalonSettings());
    void api.business
      .getSettings()
      .then((biz) => {
        const next = settingsFromApi(biz);
        setSettings(next);
        writeLocalSalonSettings(next);
      })
      .catch(() => {
        /* offline / first load — keep local */
      });
  }, []);

  useEffect(() => {
    if (!user) return;
    setName(user.name ?? '');
    setTitle(user.title ?? '');
    setPhone(user.phone ? formatBrPhone(user.phone) : '');
    setProfileEmail(user.email ?? '');
    setEmail(user.email ?? '');
  }, [user]);

  function patchDay(
    key: WeekdayKey,
    patch: Partial<{ open: boolean; openTime: string; closeTime: string }>,
  ) {
    setSettings((s) => ({
      ...s,
      weeklyHours: {
        ...s.weeklyHours,
        [key]: { ...s.weeklyHours[key], ...patch },
      },
    }));
  }

  async function save() {
    setSalonError(null);
    const hoursError = validateWeeklyHours(settings.weeklyHours);
    if (hoursError) {
      setSalonError(hoursError);
      return;
    }
    if (settings.name.trim().length < 2) {
      setSalonError('Informe o nome do estabelecimento.');
      return;
    }

    setSavingSalon(true);
    try {
      const biz = await api.business.updateSettings({
        name: settings.name.trim(),
        address: settings.address.trim(),
        weeklyHours: settings.weeklyHours,
        whatsappReminder: settings.whatsappReminder,
        cancelAlerts: settings.cancelAlerts,
      });
      const next = settingsFromApi(biz);
      setSettings(next);
      writeLocalSalonSettings(next);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1800);
    } catch (err) {
      writeLocalSalonSettings(settings);
      setSalonError(
        err instanceof Error
          ? err.message
          : 'Não foi possível salvar no servidor. Dados ficaram só neste navegador.',
      );
    } finally {
      setSavingSalon(false);
    }
  }

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    setProfileError(null);
    setProfileOk(false);

    if (name.trim().length < 2) {
      setProfileError('Informe seu nome completo.');
      return;
    }
    if (phone && !isValidBrPhone(phone)) {
      setProfileError('Telefone inválido. Use DDD + número.');
      return;
    }

    setSavingProfile(true);
    try {
      const { user: next } = await api.updateCredentials({
        currentPassword: profilePassword,
        name: name.trim(),
        title: title.trim(),
        phone: phone ? phoneDigits(phone) : '',
        email: profileEmail.trim().toLowerCase(),
      });
      setUser(next);
      setProfilePassword('');
      setProfileOk(true);
    } catch (err) {
      setProfileError(
        err instanceof Error ? err.message : 'Erro ao atualizar perfil',
      );
    } finally {
      setSavingProfile(false);
    }
  }

  async function saveCredentials(e: FormEvent) {
    e.preventDefault();
    setCredError(null);
    setCredOk(false);

    if (!newPassword && email.trim().toLowerCase() === user?.email) {
      setCredError('Informe uma nova senha para alterar o acesso.');
      return;
    }
    if (newPassword && newPassword !== confirmPassword) {
      setCredError('A confirmação da senha não confere.');
      return;
    }

    setSavingCreds(true);
    try {
      const { user: next } = await api.updateCredentials({
        currentPassword,
        email: email.trim().toLowerCase(),
        ...(newPassword ? { newPassword, confirmPassword } : {}),
      });
      setUser(next);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setCredOk(true);
    } catch (err) {
      setCredError(err instanceof Error ? err.message : 'Erro ao atualizar credenciais');
    } finally {
      setSavingCreds(false);
    }
  }

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Configurações</h1>
          <p>Preferências gerais do salão</p>
        </div>
      </header>

      <section className="settings-card">
        <h2>Meus dados</h2>
        <p style={{ marginTop: 0, color: 'var(--muted)', fontSize: '0.9rem' }}>
          Informações do administrador. Confirme a senha atual para salvar.
        </p>
        {profileError ? <div className="error-banner">{profileError}</div> : null}
        {profileOk ? (
          <div
            className="error-banner"
            style={{ color: 'var(--ok)', background: 'var(--ok-soft)' }}
          >
            Dados atualizados com sucesso.
          </div>
        ) : null}
        <form className="form-grid" onSubmit={saveProfile}>
          <label className="field">
            <span>Nome completo</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
            />
          </label>
          <label className="field">
            <span>Profissão / cargo</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: Proprietária, Cabeleireira"
            />
          </label>
          <div className="form-grid form-grid--2">
            <label className="field">
              <span>Telefone / celular</span>
              <input
                value={phone}
                onChange={(e) => setPhone(formatBrPhone(e.target.value))}
                inputMode="tel"
                placeholder="(11) 98765-4321"
              />
            </label>
            <label className="field">
              <span>E-mail</span>
              <input
                type="email"
                value={profileEmail}
                onChange={(e) => setProfileEmail(e.target.value)}
                required
              />
            </label>
          </div>
          <label className="field">
            <span>Senha atual (confirmação)</span>
            <input
              type="password"
              autoComplete="current-password"
              value={profilePassword}
              onChange={(e) => setProfilePassword(e.target.value)}
              required
            />
          </label>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn--primary" disabled={savingProfile}>
              {savingProfile ? 'Salvando…' : 'Salvar meus dados'}
            </button>
          </div>
        </form>
      </section>

      <section className="settings-card">
        <h2>Segurança da conta</h2>
        <p style={{ marginTop: 0, color: 'var(--muted)', fontSize: '0.9rem' }}>
          Altere a senha de login. É necessário confirmar a senha atual.
        </p>
        {credError ? <div className="error-banner">{credError}</div> : null}
        {credOk ? (
          <div className="error-banner" style={{ color: 'var(--ok)', background: 'var(--ok-soft)' }}>
            Senha atualizada com sucesso.
          </div>
        ) : null}
        <form className="form-grid" onSubmit={saveCredentials}>
          <label className="field">
            <span>Senha atual</span>
            <input
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </label>
          <label className="field">
            <span>E-mail de acesso</span>
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <div className="form-grid form-grid--2">
            <label className="field">
              <span>Nova senha</span>
              <input
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={6}
              />
            </label>
            <label className="field">
              <span>Confirmar nova senha</span>
              <input
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={6}
              />
            </label>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn--primary" disabled={savingCreds}>
              {savingCreds ? 'Salvando…' : 'Atualizar senha'}
            </button>
          </div>
        </form>
      </section>

      <section className="settings-card">
        <h2>Aparência</h2>
        <p style={{ marginTop: 0, color: 'var(--muted)', fontSize: '0.9rem' }}>
          Tema, densidade e menu lateral. As preferências ficam salvas neste dispositivo.
        </p>

        <h3 style={{ margin: '0.5rem 0 0.75rem', fontSize: '0.95rem' }}>Tema</h3>
        <div className="pref-grid" style={{ marginBottom: '1.25rem' }}>
          <button
            type="button"
            className={`pref-option${theme === 'dark' ? ' is-active' : ''}`}
            onClick={() => setTheme('dark')}
          >
            <strong>Escuro</strong>
            <span>Visual dark com detalhes dourados.</span>
          </button>
          <button
            type="button"
            className={`pref-option${theme === 'light' ? ' is-active' : ''}`}
            onClick={() => setTheme('light')}
          >
            <strong>Claro</strong>
            <span>Fundo claro para ambientes bem iluminados.</span>
          </button>
        </div>

        <h3 style={{ margin: '0.5rem 0 0.75rem', fontSize: '0.95rem' }}>Densidade</h3>
        <div className="pref-grid" style={{ marginBottom: '1.25rem' }}>
          <button
            type="button"
            className={`pref-option${density === 'comfortable' ? ' is-active' : ''}`}
            onClick={() => setDensity('comfortable')}
          >
            <strong>Confortável</strong>
            <span>Mais espaço entre elementos.</span>
          </button>
          <button
            type="button"
            className={`pref-option${density === 'compact' ? ' is-active' : ''}`}
            onClick={() => setDensity('compact')}
          >
            <strong>Compacto</strong>
            <span>Layout mais denso, ideal para telas menores.</span>
          </button>
        </div>

        <h3 style={{ margin: '0.5rem 0 0.75rem', fontSize: '0.95rem' }}>Menu lateral</h3>
        <div className="pref-grid">
          <button
            type="button"
            className={`pref-option${sidebar === 'expanded' ? ' is-active' : ''}`}
            onClick={() => setSidebar('expanded')}
          >
            <strong>Expandido</strong>
            <span>Ícones e rótulos visíveis.</span>
          </button>
          <button
            type="button"
            className={`pref-option${sidebar === 'rail' ? ' is-active' : ''}`}
            onClick={() => setSidebar('rail')}
          >
            <strong>Compacto (ícones)</strong>
            <span>Só ícones — mais área para o conteúdo.</span>
          </button>
        </div>
      </section>

      <section className="settings-card">
        <h2>Estabelecimento e horário</h2>
        <p className="msg-lead">
          Defina o nome e o expediente do seu salão ou barbearia. A agenda só
          aceita marcações nos dias e horários que você marcar como abertos —
          cada estabelecimento usa a grade que fizer sentido para ele.
        </p>
        {!isAdmin ? (
          <p className="msg-lead" style={{ color: 'var(--muted)' }}>
            Só o administrador pode salvar o horário para todos no servidor. Você
            ainda pode visualizar a grade atual.
          </p>
        ) : null}
        {salonError ? <div className="error-banner">{salonError}</div> : null}
        <div className="form-grid">
          <label className="field">
            <span>Nome do estabelecimento</span>
            <input
              value={settings.name}
              disabled={!isAdmin}
              onChange={(e) => setSettings((s) => ({ ...s, name: e.target.value }))}
            />
          </label>
          <label className="field">
            <span>Endereço</span>
            <input
              value={settings.address}
              disabled={!isAdmin}
              onChange={(e) => setSettings((s) => ({ ...s, address: e.target.value }))}
            />
          </label>
        </div>

        <h3 className="settings-subhead">Horário de funcionamento</h3>
        <div className="hours-week" role="table" aria-label="Horário semanal">
          <div className="hours-week__head" role="row">
            <span>Dia</span>
            <span>Aberto</span>
            <span>Abre</span>
            <span>Fecha</span>
          </div>
          {WEEKDAY_UI_ORDER.map((key) => {
            const day = settings.weeklyHours[key];
            return (
              <div
                key={key}
                className={`hours-week__row${day.open ? '' : ' is-closed'}`}
                role="row"
              >
                <span className="hours-week__day">{WEEKDAY_LABELS[key]}</span>
                <label className="hours-week__toggle">
                  <input
                    type="checkbox"
                    checked={day.open}
                    disabled={!isAdmin}
                    onChange={(e) => patchDay(key, { open: e.target.checked })}
                    aria-label={`${WEEKDAY_LABELS[key]} aberto`}
                  />
                  <span>{day.open ? 'Sim' : 'Não'}</span>
                </label>
                <input
                  type="time"
                  value={day.openTime}
                  disabled={!isAdmin || !day.open}
                  onChange={(e) => patchDay(key, { openTime: e.target.value })}
                  aria-label={`Abertura ${WEEKDAY_LABELS[key]}`}
                />
                <input
                  type="time"
                  value={day.closeTime}
                  disabled={!isAdmin || !day.open}
                  onChange={(e) => patchDay(key, { closeTime: e.target.value })}
                  aria-label={`Fechamento ${WEEKDAY_LABELS[key]}`}
                />
              </div>
            );
          })}
        </div>
      </section>

      <section className="settings-card">
        <h2>Ajuda</h2>
        <p className="msg-lead">
          Novo no sistema? Veja o curso rápido em{' '}
          <Link to="/app/como-usar">Como usar</Link> — 7 passos para deixar o
          salão pronto.
        </p>
      </section>

      <section className="settings-card">
        <h2>Comunicação com clientes</h2>
        <p className="msg-lead">
          O contato com clientes é feito pelo WhatsApp do estabelecimento na aba{' '}
          <Link to="/app/comunicacoes">Comunicações</Link>.
        </p>
        <div className="check-list">
          <label className="check-row">
            <span>Sugerir lembrete de agendamento por WhatsApp</span>
            <input
              type="checkbox"
              checked={settings.whatsappReminder}
              onChange={(e) =>
                setSettings((s) => ({ ...s, whatsappReminder: e.target.checked }))
              }
            />
          </label>
          <label className="check-row">
            <span>Alertas de cancelamento</span>
            <input
              type="checkbox"
              checked={settings.cancelAlerts}
              onChange={(e) =>
                setSettings((s) => ({ ...s, cancelAlerts: e.target.checked }))
              }
            />
          </label>
        </div>
      </section>

      <div style={{ maxWidth: 720, display: 'flex', justifyContent: 'flex-end' }}>
        <button
          type="button"
          className="btn btn--primary"
          disabled={savingSalon || !isAdmin}
          onClick={() => void save()}
        >
          {savingSalon
            ? 'Salvando…'
            : saved
              ? 'Salvo!'
              : isAdmin
                ? 'Salvar estabelecimento e horário'
                : 'Somente administrador salva'}
        </button>
      </div>
    </>
  );
}
