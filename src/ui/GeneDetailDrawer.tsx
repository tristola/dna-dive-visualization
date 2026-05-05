import { useEffect, useState } from 'react';
import { SHOWCASE_GENES } from '../data/genes';
import { EnsemblLookup, lookupGene } from '../lib/ensembl';
import { useScene } from '../lib/store';

type FetchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ok'; data: EnsemblLookup }
  | { status: 'error'; message: string };

export default function GeneDetailDrawer() {
  const drawerGeneId = useScene((s) => s.drawerGeneId);
  const setDrawerGene = useScene((s) => s.setDrawerGene);
  const setSelectedGene = useScene((s) => s.setSelectedGene);
  const [fetchState, setFetchState] = useState<FetchState>({ status: 'idle' });

  const gene = SHOWCASE_GENES.find((g) => g.id === drawerGeneId) ?? null;

  useEffect(() => {
    let cancelled = false;
    if (!gene) {
      setFetchState({ status: 'idle' });
      return;
    }
    setFetchState({ status: 'loading' });
    lookupGene(gene.ensemblId)
      .then((data) => {
        if (!cancelled) setFetchState({ status: 'ok', data });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Lookup failed';
          setFetchState({ status: 'error', message });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [gene]);

  if (!gene) return null;

  return (
    <section className={`gene-drawer${gene ? ' visible' : ''}`} aria-label={`${gene.id} details`}>
      <button
        className="gene-drawer-close"
        onClick={() => {
          setDrawerGene(null);
          setSelectedGene(null);
        }}
        aria-label="Close gene details"
      >
        ×
      </button>
      <div className="gene-drawer-status">
        {fetchState.status === 'loading' && '◷ querying ensembl rest…'}
        {fetchState.status === 'ok' && '✓ ensembl · live'}
        {fetchState.status === 'error' && '◌ ensembl unavailable · curated only'}
        {fetchState.status === 'idle' && ' '}
      </div>
      <div className="gene-drawer-title">
        {gene.id}
        {fetchState.status === 'ok' && fetchState.data.display_name && fetchState.data.display_name !== gene.id ? (
          <span style={{ color: 'var(--fg-muted)', fontWeight: 400, marginLeft: 8, fontSize: 13 }}>
            ({fetchState.data.display_name})
          </span>
        ) : null}
      </div>
      <div className="gene-drawer-row">
        <span>Ensembl ID</span>
        <strong style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>{gene.ensemblId}</strong>
      </div>
      <div className="gene-drawer-row">
        <span>Locus</span>
        <strong>
          chr{gene.chromosome}:{gene.startBp.toLocaleString()}–{gene.endBp.toLocaleString()}
        </strong>
      </div>
      {fetchState.status === 'ok' && fetchState.data.biotype && (
        <div className="gene-drawer-row">
          <span>Biotype</span>
          <strong>{fetchState.data.biotype.replace(/_/g, ' ')}</strong>
        </div>
      )}
      {fetchState.status === 'ok' && fetchState.data.assembly_name && (
        <div className="gene-drawer-row">
          <span>Assembly</span>
          <strong>{fetchState.data.assembly_name}</strong>
        </div>
      )}
      <p className="gene-drawer-blurb">
        {fetchState.status === 'ok' && fetchState.data.description ? (
          <>
            {stripCitations(fetchState.data.description)}
            <br />
            <br />
            <span style={{ color: 'var(--fg-muted)' }}>{gene.blurb}</span>
          </>
        ) : (
          gene.blurb
        )}
      </p>
    </section>
  );
}

// Ensembl descriptions often end with a "[Source: ...]" tag — strip it for readability.
function stripCitations(s: string): string {
  return s.replace(/\s*\[Source:[^\]]*\]\s*$/i, '').trim();
}
