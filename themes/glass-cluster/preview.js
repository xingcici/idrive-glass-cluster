import { parseTheme } from '@idv7lol/theme-schema';
import { ThemeEngine } from '@idv7lol/theme-engine';
import standardSource from './theme.json';
import sportSource from '../glass-cluster-sport/theme.json';
const isSport = new URLSearchParams(location.search).get('layout') === 'sport';
const source = isSport ? sportSource : standardSource;

const parsed = parseTheme(source);
if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues));
const engine = new ThemeEngine();
const canvas = document.querySelector('canvas');
const controls = Object.fromEntries(
  ['palette', 'speed', 'rpm', 'zones', 'missing', 'factory'].map((id) => [
    id,
    document.getElementById(id),
  ]),
);
if (isSport) {
  controls.palette.value = 'sport';
  controls.speed.value = '120';
  controls.rpm.value = '5400';
}
const samples = {
  'vehicle.range': 426,
  'vehicle.trip.distance': 65,
  'engine.oil.temp': 96,
  'environment.outside.temp': 22,
  'transmission.gear': isSport ? '3' : 'D',
  'drive.mode': 'COMFORT',
  'fuel.level': 68,
};
function draw() {
  engine.reset(0);
  engine.state.bus.clear();
  engine.state.manualPalette = controls.palette.value;
  if (!controls.missing.checked) {
    Object.entries({
      ...samples,
      'vehicle.speed': Number(controls.speed.value),
      'engine.rpm': Number(controls.rpm.value),
      'drive.mode':
        controls.palette.value === 'sport'
          ? 'SPORT'
          : controls.palette.value === 'eco'
            ? 'ECO_PRO'
            : 'COMFORT',
    }).forEach(([id, value]) => engine.state.bus.set(id, value, 0));
  }
  engine.render(canvas.getContext('2d'), parsed.theme, 0, {
    showReservedZones: controls.zones.checked,
    wallClock: () => new Date(2026, 0, 1, 15, 28),
  });
  // This is a preview-only stand-in for BMW's separately rendered factory gear layer.
  if (controls.factory.checked) {
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.fillStyle = '#f4f6fa';
    ctx.font = isSport ? '144px sans-serif' : '112px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(controls.missing.checked ? '-' : samples['transmission.gear'], 1536, 375);
    ctx.restore();
  }
}
Object.values(controls).forEach((control) => control.addEventListener('input', draw));
draw();
