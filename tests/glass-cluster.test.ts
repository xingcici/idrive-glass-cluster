import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseTheme } from '@idv7lol/theme-schema';
import { validateTheme } from '@idv7lol/theme-compiler';
import { EngineState, selectPaletteId } from '@idv7lol/theme-engine';

const source = JSON.parse(
  readFileSync(new URL('../themes/glass-cluster/theme.json', import.meta.url), 'utf8'),
);
const parsed = parseTheme(source);
if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues));
const theme = parsed.theme;

describe('Glass Cluster', () => {
  it('keeps the split tachometer continuous across sector boundaries', () => {
    const sectors = theme.components.filter((c) => c.id.startsWith('revs-'));
    expect(sectors).toHaveLength(9);
    const state = new EngineState();
    for (const rpm of [0, 7000 / 9, 2400, 6000, 7000, 8000]) {
      state.bus.set('engine.rpm', rpm, 0);
      const filled = sectors.reduce(
        (sum, c) => sum + state.evaluate(c.id, c.binding!).normalized / sectors.length,
        0,
      );
      expect(filled).toBeCloseTo(Math.min(rpm / 7000, 1));
    }
  });
  it('fits renderer limits and reserved regions without unsupported glyphs', () => {
    const report = validateTheme(source);
    expect(report.errors).toEqual([]);
    expect(report.warnings).toEqual([]);
  });
  it('selects the palette from driving mode', () => {
    const state = new EngineState();
    for (const [mode, palette] of [
      ['COMFORT', 'graphite'],
      ['SPORT', 'sport'],
      ['ECO_PRO', 'eco'],
    ]) {
      state.bus.set('drive.mode', mode!, 0);
      expect(selectPaletteId(theme, state)).toBe(palette);
    }
  });
  it('distinguishes missing speed from a valid zero reading', () => {
    const state = new EngineState();
    const binding = theme.components.find((c) => c.id === 'speed')!.binding!;
    expect(binding.fallback).toBe('dash');
    expect(state.evaluate('speed', binding).valid).toBe(false);
    state.bus.set('vehicle.speed', 0, 0);
    expect(state.evaluate('speed', binding).valid).toBe(true);
    expect(state.evaluate('speed', binding).value).toBe(0);
    state.bus.invalidate('vehicle.speed', 0);
    expect(state.evaluate('speed', binding).valid).toBe(false);
  });
});
