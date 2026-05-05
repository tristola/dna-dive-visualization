import { StageId, useScene } from '../lib/store';
import GenePanel from './GenePanel';
import GeneDetailDrawer from './GeneDetailDrawer';

const STAGE_LABELS: Record<StageId, string> = {
  cell: 'Cell',
  nucleus: 'Nucleus',
  chromatin: 'Chromatin',
  dna: 'DNA · Double Helix',
};

const STAGES: StageId[] = ['cell', 'nucleus', 'chromatin', 'dna'];

export default function Overlay() {
  const stage = useScene((s) => s.stage);
  const offset = useScene((s) => s.scrollOffset);
  // Gene panel is available a bit earlier — once the camera is past the cell
  // and approaching the DNA, so users can pre-select a gene to highlight.
  const panelVisible = offset >= 0.36;

  const skipToDna = () => {
    window.dispatchEvent(new CustomEvent<number>('scroll-to-offset', { detail: 0.62 }));
  };

  const restart = () => {
    window.dispatchEvent(new CustomEvent<number>('scroll-to-offset', { detail: 0 }));
  };

  return (
    <div className="overlay" aria-hidden={false}>
      <div className="overlay-top">
        <div className="brand">
          <span className="brand-mark">Inside the Genome</span>
          <span className="brand-title">A scroll-driven dive from cell to DNA</span>
        </div>
        <div className="stage-indicator" role="status" aria-live="polite">
          <span className="stage-dots" aria-hidden>
            {STAGES.map((s) => (
              <span key={s} className={`stage-dot${s === stage ? ' active' : ''}`} />
            ))}
          </span>
          <span className="stage-name">
            stage<strong>{STAGE_LABELS[stage]}</strong>
          </span>
        </div>
      </div>

      <GenePanel visible={panelVisible} />
      <GeneDetailDrawer />

      <div className="overlay-bottom">
        <div className="scroll-hint" aria-hidden={offset > 0.05}>
          <span className="pulse" />
          <span>{offset > 0.05 ? `progress · ${Math.round(offset * 100)}%` : 'scroll to descend'}</span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {offset > 0.6 ? (
            <button className="skip-button" onClick={restart} aria-label="Restart from the cell exterior">
              ↻ Restart
            </button>
          ) : (
            <button className="skip-button" onClick={skipToDna} aria-label="Skip to DNA strand">
              Skip to DNA →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
