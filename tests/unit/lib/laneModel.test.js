import { describe, expect, it } from '@jest/globals';
import { buildLaneModel } from '../../../public/js/lib/laneModel.js';
import { sampleLookup } from '../../helpers/fixtures.js';

const lookup = sampleLookup();
const SUNDAY_10H = new Date(2026, 8, 27, 10, 0);
const crons = [
  { id: 'backup-sd', expressao: '0 3 * * 0' },
  { id: 'coletor-painel', expressao: '* * * * *' },
  { id: 'faxina-docker', expressao: '30 16 * * *' },
];

describe('buildLaneModel', () => {
  const model = buildLaneModel({ crons, lookup, now: SUNDAY_10H });

  it('posiciona o Pac-Man pela hora do dia', () => {
    expect(model.posicaoPct).toBeCloseTo((600 / 1440) * 100);
  });

  it('cria pastilhas só para crons pouco frequentes, marcando as já comidas', () => {
    expect(model.pastilhas).toEqual([
      { posicaoPct: 12.5, comida: true, rotulo: 'Magrathea · clone do SD · 03:00' },
      { posicaoPct: (990 / 1440) * 100, comida: false, rotulo: 'Faxina do hangar · 16:30' },
    ]);
  });

  it('aponta a próxima pastilha, ignorando crons de alta frequência', () => {
    expect(model.proxima).toEqual({ nome: 'Faxina do hangar', quando: new Date(2026, 8, 27, 16, 30) });
  });

  it('respeita a próxima execução informada pelo coletor', () => {
    const informed = new Date(2026, 8, 27, 11, 0);
    const result = buildLaneModel({
      crons: [{ id: 'backup-sd', expressao: '0 3 * * 0', proxima: informed.toISOString() }],
      lookup,
      now: SUNDAY_10H,
    });
    expect(result.proxima.quando).toEqual(informed);
  });

  it('sem crons, sem pastilhas', () => {
    expect(buildLaneModel({ crons: [], lookup, now: SUNDAY_10H })).toMatchObject({
      pastilhas: [],
      proxima: null,
    });
  });
});
