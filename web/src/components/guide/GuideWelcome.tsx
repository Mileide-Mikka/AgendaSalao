import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { isGuideCompleted } from '../../lib/guide';

const DISMISS_KEY = 'belle-guide-welcome-dismissed';

export function GuideWelcome() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (isGuideCompleted()) return;
      if (localStorage.getItem(DISMISS_KEY) === '1') return;
      setVisible(true);
    } catch {
      /* ignore */
    }
  }, []);

  if (!visible) return null;

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
    setVisible(false);
  }

  return (
    <div className="guide-welcome" role="dialog" aria-labelledby="guide-welcome-title">
      <div className="guide-welcome__card">
        <p className="guide-welcome__eyebrow">Curso rápido</p>
        <h2 id="guide-welcome-title">Quer um tour de como usar o Belle?</h2>
        <p>
          Em 7 passos curtos você cadastra serviços, equipe, clientes e agenda —
          e aprende a falar com o cliente pelo WhatsApp.
        </p>
        <div className="modal__actions">
          <button type="button" className="btn btn--ghost" onClick={dismiss}>
            Agora não
          </button>
          <Link className="btn btn--primary" to="/app/como-usar" onClick={dismiss}>
            Começar o guia
          </Link>
        </div>
      </div>
    </div>
  );
}
