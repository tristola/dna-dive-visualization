export type EnsemblLookup = {
  id: string;
  display_name?: string;
  description?: string;
  biotype?: string;
  seq_region_name?: string;
  start?: number;
  end?: number;
  strand?: number;
  species?: string;
  assembly_name?: string;
};

const BASE = 'https://rest.ensembl.org';
const cache = new Map<string, Promise<EnsemblLookup>>();

export function lookupGene(ensemblId: string): Promise<EnsemblLookup> {
  const cached = cache.get(ensemblId);
  if (cached) return cached;

  const promise = fetch(`${BASE}/lookup/id/${ensemblId}?expand=0`, {
    headers: { Accept: 'application/json' },
  }).then(async (res) => {
    if (!res.ok) throw new Error(`Ensembl ${res.status}`);
    return (await res.json()) as EnsemblLookup;
  });

  // Don't cache failures — let the next click retry.
  promise.catch(() => cache.delete(ensemblId));
  cache.set(ensemblId, promise);
  return promise;
}
