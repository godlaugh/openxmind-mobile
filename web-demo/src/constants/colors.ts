export const ACCENTS = [
  '#3E9E8C',
  '#8F6BB0',
  '#6DA84E',
  '#C08C3A',
];

// Six curated mono palettes — all deep "ink on parchment" tones
export const MONO_PALETTES: { name: string; color: string }[] = [
  { name: '墨蓝', color: '#1B365D' },
  { name: '松绿', color: '#1C3D2A' },
  { name: '紫砂', color: '#3A1F58' },
  { name: '砖红', color: '#6B2323' },
  { name: '暖炭', color: '#2A2520' },
  { name: '赭棕', color: '#5C3418' },
];

export const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  todo:  { color: '#AAAABB', label: '○' },
  doing: { color: '#5580C0', label: '◑' },
  done:  { color: '#3E9E8C', label: '✓' },
};
