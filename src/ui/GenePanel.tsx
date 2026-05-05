import { SHOWCASE_GENES } from '../data/genes';
import { useScene } from '../lib/store';

export default function GenePanel({ visible }: { visible: boolean }) {
  const selectedGeneId = useScene((s) => s.selectedGeneId);
  const setSelectedGene = useScene((s) => s.setSelectedGene);
  const setDrawerGene = useScene((s) => s.setDrawerGene);

  const onSelect = (id: string) => {
    // Always select — clicking a different gene swaps; clicking the current
    // gene re-asserts. To clear, the user closes the drawer.
    setSelectedGene(id);
    setDrawerGene(id);
  };

  return (
    <aside
      className={`gene-panel${visible ? ' visible' : ''}`}
      aria-hidden={!visible}
      aria-label="Showcase genes"
    >
      <div className="gene-panel-header">Showcase genes · GRCh38</div>
      <div className="gene-panel-title">Highlight a region of the strand</div>
      <div className="gene-list">
        {SHOWCASE_GENES.map((g) => (
          <button
            key={g.id}
            className={`gene-chip${selectedGeneId === g.id ? ' selected' : ''}`}
            onClick={() => onSelect(g.id)}
            tabIndex={visible ? 0 : -1}
          >
            <span className="gene-chip-title">
              <span>{g.id}</span>
              <span className="gene-chip-loc">chr{g.chromosome}</span>
            </span>
            <span className="gene-chip-blurb">{g.function}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}
