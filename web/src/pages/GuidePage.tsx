import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  GUIDE_LESSONS,
  isGuideCompleted,
  markGuideCompleted,
  resetGuideProgress,
  type GuideLesson,
} from '../lib/guide';

export function GuidePage() {
  const [openId, setOpenId] = useState<string>(GUIDE_LESSONS[0].id);
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDone(isGuideCompleted());
  }, []);

  function toggle(lesson: GuideLesson) {
    setOpenId((current) => (current === lesson.id ? '' : lesson.id));
  }

  function finish() {
    markGuideCompleted();
    setDone(true);
  }

  function restart() {
    resetGuideProgress();
    setDone(false);
    setOpenId(GUIDE_LESSONS[0].id);
  }

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Como usar</h1>
          <p>Um curso rápido para deixar o salão pronto em poucos passos.</p>
        </div>
        {done ? (
          <button type="button" className="btn btn--soft" onClick={restart}>
            Refazer o guia
          </button>
        ) : (
          <button type="button" className="btn btn--primary" onClick={finish}>
            Marcar como concluído
          </button>
        )}
      </header>

      {done ? (
        <div
          className="error-banner"
          style={{ color: 'var(--ok)', background: 'var(--ok-soft)' }}
        >
          Você já concluiu o guia. Pode revisitá-lo quando quiser.
        </div>
      ) : (
        <div className="guide-intro settings-card">
          <h2>Bem-vindo ao Belle</h2>
          <p className="msg-lead">
            Siga as aulas na ordem. Cada uma abre a tela certa do sistema para você
            praticar. Leva poucos minutos.
          </p>
        </div>
      )}

      <ol className="guide-list">
        {GUIDE_LESSONS.map((lesson, index) => {
          const open = openId === lesson.id;
          return (
            <li key={lesson.id} className={`guide-card${open ? ' is-open' : ''}`}>
              <button
                type="button"
                className="guide-card__head"
                onClick={() => toggle(lesson)}
                aria-expanded={open}
              >
                <span className="guide-card__index">{index + 1}</span>
                <span className="guide-card__titles">
                  <strong>{lesson.title.replace(/^\d+\.\s*/, '')}</strong>
                  <span>{lesson.summary}</span>
                </span>
                <span className="guide-card__chevron" aria-hidden>
                  {open ? '−' : '+'}
                </span>
              </button>

              {open ? (
                <div className="guide-card__body">
                  <ol className="guide-card__steps">
                    {lesson.steps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                  {lesson.tip ? (
                    <p className="guide-card__tip">
                      <strong>Dica:</strong> {lesson.tip}
                    </p>
                  ) : null}
                  {lesson.to ? (
                    <div className="modal__actions" style={{ marginTop: '0.85rem' }}>
                      <Link className="btn btn--primary" to={lesson.to}>
                        {lesson.cta ?? 'Abrir tela'}
                      </Link>
                      {index < GUIDE_LESSONS.length - 1 ? (
                        <button
                          type="button"
                          className="btn btn--ghost"
                          onClick={() =>
                            setOpenId(GUIDE_LESSONS[index + 1].id)
                          }
                        >
                          Próxima aula
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn--soft"
                          onClick={finish}
                        >
                          Concluir curso
                        </button>
                      )}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
    </>
  );
}
