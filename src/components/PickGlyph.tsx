/** Pick thumbnail: a thin ring and its teeth, at a given rotation. */
import { POSITIONS, positionsFromMask, rotateMask } from '../engine';
import { COLORS } from './theme';

export interface PickGlyphProps {
  teeth: number;
  rotation?: number;
  size?: number;
  color?: string;
}

export function PickGlyph({ teeth, rotation = 0, size = 52, color = COLORS.steel }: PickGlyphProps) {
  const c = 50;
  const r = 30;
  const positions = positionsFromMask(rotateMask(teeth, rotation));
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden>
      <circle cx={c} cy={c} r={r} fill="none" stroke={color} strokeOpacity={0.35} strokeWidth={3} />
      {positions.map((p) => (
        <rect key={p} x={c - 5} y={c - r - 14} width={10} height={20} rx={2} fill={color} transform={`rotate(${(p * 360) / POSITIONS} ${c} ${c})`} />
      ))}
    </svg>
  );
}
