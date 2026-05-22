/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import html2pdf from 'html2pdf.js';

export async function exportToPDF(element: HTMLElement, filename: string): Promise<void> {
  const opt = {
    margin: [0.5, 0.5, 0.5, 0.5] as [number, number, number, number],
    filename,
    image: { type: 'jpeg' as const, quality: 0.98 },
    html2canvas: { scale: 2, letterRendering: true, useCORS: true },
    jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' as const },
  };
  await html2pdf().set(opt).from(element).save();
}

export function pdfFileName(title: string): string {
  const safe = safeFileStem(title) || '无标题笔记';
  return `${safe}.pdf`;
}

function safeFileStem(value: string): string {
  return value
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]+/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);
}
