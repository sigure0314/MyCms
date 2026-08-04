const numberFormatter = new Intl.NumberFormat('zh-TW', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const integerFormatter = new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 0 });

export const formatNumber = (value: number) => numberFormatter.format(value);
export const formatInteger = (value: number) => integerFormatter.format(value);
export const formatPercent = (value: number) => `${numberFormatter.format(value)}%`;
export const formatSigned = (value: number) => `${value > 0 ? '+' : ''}${numberFormatter.format(value)}`;
export const formatCompactNumber = (value: number) => new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 2 }).format(value);
export const formatDate = (value: string) => new Intl.DateTimeFormat('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
export const formatDateTime = (value: string) => new Intl.DateTimeFormat('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value));
export const getChangeTone = (value: number) => value > 0 ? 'rise' : value < 0 ? 'fall' : 'flat';

