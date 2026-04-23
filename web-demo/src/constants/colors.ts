// Muted-vibrant accents — saturated enough to read, restrained enough not to shout
export const ACCENTS = [
  '#7B7CEB', // indigo
  '#E86F9E', // rose
  '#3DBFA6', // teal
  '#E8A93A', // amber
];

export const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  todo:  { color: '#48485E', label: '待办'   },
  doing: { color: '#7B7CEB', label: '进行中' },
  done:  { color: '#3DBFA6', label: '完成'   },
};
