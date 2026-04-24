// Sophisticated muted accents — warm earth tones, not saturated primaries
export const ACCENTS = [
  '#3E9E8C', // muted teal
  '#8F6BB0', // muted violet
  '#6DA84E', // sage green
  '#C08C3A', // warm amber
];

export const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  todo:  { color: '#AAAABB', label: '待办'   },
  doing: { color: '#5580C0', label: '进行中' },
  done:  { color: '#3E9E8C', label: '完成'   },
};
