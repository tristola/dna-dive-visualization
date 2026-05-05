export type ShowcaseGene = {
  id: string;
  ensemblId: string;
  chromosome: string;
  startBp: number;
  endBp: number;
  /** Inclusive rung indices on the rendered DNA helix (0..rungs-1) — purely for visual highlighting. */
  basePairRange: [number, number];
  blurb: string;
  function: string;
};

/**
 * Six well-known human genes. Genomic coordinates are GRCh38.
 * basePairRange is hand-picked to spread highlights along the rendered helix
 * so the visual story reads cleanly — these are not to scale with real bp counts.
 */
export const SHOWCASE_GENES: ShowcaseGene[] = [
  {
    id: 'BRCA1',
    ensemblId: 'ENSG00000012048',
    chromosome: '17',
    startBp: 43044295,
    endBp: 43125483,
    basePairRange: [18, 36],
    blurb: 'A tumour suppressor that helps repair double-strand DNA breaks. Loss-of-function variants sharply raise breast and ovarian cancer risk.',
    function: 'DNA double-strand break repair',
  },
  {
    id: 'TP53',
    ensemblId: 'ENSG00000141510',
    chromosome: '17',
    startBp: 7668421,
    endBp: 7687490,
    basePairRange: [56, 72],
    blurb: '"Guardian of the genome." Halts division and triggers apoptosis when DNA damage is detected. Mutated in more than half of all human cancers.',
    function: 'Cell cycle arrest, apoptosis',
  },
  {
    id: 'CFTR',
    ensemblId: 'ENSG00000001626',
    chromosome: '7',
    startBp: 117465784,
    endBp: 117715971,
    basePairRange: [92, 118],
    blurb: 'Encodes a chloride channel on epithelial cells. The ΔF508 mutation accounts for most cystic fibrosis cases worldwide.',
    function: 'Chloride ion transport',
  },
  {
    id: 'HBB',
    ensemblId: 'ENSG00000244734',
    chromosome: '11',
    startBp: 5225464,
    endBp: 5227071,
    basePairRange: [134, 146],
    blurb: 'Beta-globin subunit of haemoglobin. A single base change (GAG → GTG) at codon 6 causes sickle-cell disease.',
    function: 'Oxygen transport (haemoglobin)',
  },
  {
    id: 'APOE',
    ensemblId: 'ENSG00000130203',
    chromosome: '19',
    startBp: 44905782,
    endBp: 44909393,
    basePairRange: [162, 174],
    blurb: 'Apolipoprotein E. The ε4 allele is the strongest known common-variant risk factor for late-onset Alzheimer\'s disease.',
    function: 'Lipid transport, neuronal repair',
  },
  {
    id: 'MYH7',
    ensemblId: 'ENSG00000092054',
    chromosome: '14',
    startBp: 23412927,
    endBp: 23435660,
    basePairRange: [188, 208],
    blurb: 'Beta-myosin heavy chain — the motor protein of cardiac and slow skeletal muscle. Pathogenic variants are a leading cause of hypertrophic cardiomyopathy.',
    function: 'Cardiac muscle contraction',
  },
];
