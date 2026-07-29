import { useId, useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import './LoginPage.css';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginPage() {
  const { user, loading, login } = useAuth();
  const emailId = useId();
  const passwordId = useId();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) {
    return (
      <Navigate
        to={user.mustChangePassword ? '/primeiro-acesso' : '/app'}
        replace
      />
    );
  }

  function validate() {
    const next: { email?: string; password?: string } = {};
    const normalized = email.trim().toLowerCase();
    if (!normalized) next.email = 'Informe seu e-mail';
    else if (!EMAIL_RE.test(normalized)) next.email = 'E-mail inválido';
    if (!password) next.password = 'Informe sua senha';
    else if (password.length < 6) next.password = 'Mínimo de 6 caracteres';
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    if (!validate() || submitting) return;
    setSubmitting(true);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Falha no login');
      setPassword('');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login">
      <section className="login__form-side">
        <div className="login__brand">
          <svg className="login__brand-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            <circle cx="6" cy="6" r="2.4" />
            <circle cx="6" cy="18" r="2.4" />
            <path d="M8.2 7.8 20 18M8.2 16.2 20 6" />
          </svg>
          <div>
            <strong>Belle</strong>
            <span>Salão & Barbearia</span>
          </div>
        </div>

        <h1>Bem-vinda de volta</h1>
        <p>Acesse sua agenda e gerencie seus atendimentos.</p>

        <form className="login__form" onSubmit={onSubmit} noValidate>
          <label className="login__field" htmlFor={emailId}>
            <span>E-mail</span>
            <input
              id={emailId}
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting || loading}
            />
            {fieldErrors.email ? <em>{fieldErrors.email}</em> : null}
          </label>

          <div className="login__field">
            <div className="login__field-head">
              <label htmlFor={passwordId}>
                <span>Senha</span>
              </label>
            </div>
            <div className="login__password">
              <input
                id={passwordId}
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting || loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
            {fieldErrors.password ? <em>{fieldErrors.password}</em> : null}
          </div>

          {formError ? <p className="login__error">{formError}</p> : null}

          <button type="submit" className="login__submit" disabled={submitting || loading}>
            {submitting ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        <p className="login__footer">
          Acesso restrito à equipe do salão.
        </p>
      </section>

      <aside className="login__hero" aria-hidden>
        <blockquote className="login__quote">
          <p>“A beleza começa no momento em que você decide ser você mesma.”</p>
          <cite>— Coco Chanel</cite>
        </blockquote>
      </aside>
    </main>
  );
}
