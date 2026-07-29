import { useEffect, useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { api } from '../lib/api';
import {
  formatBrPhone,
  isValidBrPhone,
  phoneDigits,
} from '../lib/phone';

export function FirstAccessPage() {
  const { user, loading, setUser, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setEmail(user.email);
    if (user.name && user.name !== 'Administrador') setName(user.name);
    if (user.title) setTitle(user.title);
    if (user.phone) setPhone(formatBrPhone(user.phone));
  }, [user]);

  if (loading) {
    return (
      <main className="main" style={{ display: 'grid', placeItems: 'center' }}>
        <p>Carregando…</p>
      </main>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!user.mustChangePassword) return <Navigate to="/app" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (name.trim().length < 2) {
      setError('Informe seu nome completo.');
      return;
    }
    if (phone && !isValidBrPhone(phone)) {
      setError('Telefone inválido. Use DDD + número (ex.: (11) 98765-4321).');
      return;
    }
    if (!newPassword) {
      setError('No primeiro acesso é obrigatório definir uma nova senha.');
      return;
    }
    if (newPassword.length < 6) {
      setError('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('A confirmação da senha não confere.');
      return;
    }

    setSaving(true);
    try {
      const { user: next } = await api.updateCredentials({
        currentPassword,
        name: name.trim(),
        title: title.trim(),
        phone: phone ? phoneDigits(phone) : undefined,
        email: email.trim().toLowerCase(),
        newPassword,
        confirmPassword,
      });
      setUser(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível atualizar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="login" style={{ gridTemplateColumns: '1fr' }}>
      <section className="login__form-side" style={{ maxWidth: 520, margin: '0 auto' }}>
        <div className="login__brand">
          <div>
            <strong>Belle</strong>
            <span>Salão & Barbearia</span>
          </div>
        </div>

        <h1>Primeiro acesso</h1>
        <p>
          Complete seus dados de administrador, defina o e-mail de acesso e troque
          a senha padrão.
        </p>

        {error ? <div className="error-banner">{error}</div> : null}

        <form className="login__form" onSubmit={onSubmit}>
          <label className="login__field">
            <span>Nome completo</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              required
              minLength={2}
            />
          </label>

          <label className="login__field">
            <span>Profissão / cargo</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: Proprietária, Cabeleireira, Barbeiro"
            />
          </label>

          <label className="login__field">
            <span>Telefone / celular</span>
            <input
              value={phone}
              onChange={(e) => setPhone(formatBrPhone(e.target.value))}
              inputMode="tel"
              autoComplete="tel"
              placeholder="(11) 98765-4321"
            />
          </label>

          <label className="login__field">
            <span>E-mail de acesso</span>
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          <label className="login__field">
            <span>Senha atual</span>
            <input
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </label>

          <label className="login__field">
            <span>Nova senha</span>
            <input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={6}
              required
            />
          </label>

          <label className="login__field">
            <span>Confirmar nova senha</span>
            <input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={6}
              required
            />
          </label>

          <button type="submit" className="login__submit" disabled={saving}>
            {saving ? 'Salvando…' : 'Salvar e continuar'}
          </button>
        </form>

        <p className="login__footer">
          <button type="button" onClick={() => void logout()}>
            Sair
          </button>
        </p>
      </section>
    </main>
  );
}
