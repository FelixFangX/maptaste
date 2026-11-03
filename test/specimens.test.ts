import { describe, expect, it } from 'vitest';
import { check } from '../src/index.js';
import { tasteSpecimen } from '../src/specimens.js';

describe('choropleth specimens', () => {
  it('flags the rainbow fixture and passes the sequential fixture', () => {
    const rainbow = check(tasteSpecimen('rainbow'));
    const sequential = check(tasteSpecimen('sequential'));
    expect(rainbow.findings.map(finding => finding.id)).toContain('MT001');
    expect(rainbow.findings.some(finding => finding.id === 'MT001' && finding.severity === 'error')).toBe(true);
    expect(sequential.findings).toEqual([]);
    expect(sequential.score).toBe(100);
    expect(rainbow.score).toBeLessThan(sequential.score);
  });
});
