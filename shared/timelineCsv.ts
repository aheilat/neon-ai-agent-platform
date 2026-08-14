export type TimelineCsvRow = {
  createdAt: string | Date;
  websiteUrl: string;
  status: string;
  changesSummary: string;
  serviceCount: number;
  faqCount: number;
};

const headers = [
  "تاريخ المزامنة",
  "رابط الموقع",
  "الحالة",
  "ملخص التغييرات",
  "عدد الخدمات",
  "عدد الأسئلة الشائعة",
];

function escapeCsv(value: string | number) {
  const text = String(value ?? "").replace(/\r?\n/g, " ");
  return /[",;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function buildTimelineCsv(rows: TimelineCsvRow[]) {
  const body = rows.map(row => [
    row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    row.websiteUrl,
    row.status,
    row.changesSummary,
    row.serviceCount,
    row.faqCount,
  ].map(escapeCsv).join(","));
  return `\uFEFF${[headers.map(escapeCsv).join(","), ...body].join("\r\n")}\r\n`;
}
