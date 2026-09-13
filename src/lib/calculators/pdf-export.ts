"use client";

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { CALCULATOR_RESULT_NOTICE } from "@/lib/legal/constants";

export type PdfReportData = {
  title: string;
  standard?: string;
  generatedAt: string;
  inputs: { label: string; value: string }[];
  results: { label: string; value: string }[];
  /** Optional PNG/JPEG data URL (e.g. bolt numbering diagram). */
  diagramImageDataUrl?: string;
  diagramCaption?: string;
};

/** Helvetica cannot measure arrows/dashes reliably — normalize for wrap + overflow. */
function pdfSafeText(value: string): string {
  return value
    .replace(/\u2192/g, ">") // →
    .replace(/\u2190/g, "<")
    .replace(/[\u2013\u2014\u2212]/g, "-")
    .replace(/\u00a0/g, " ")
    .replace(/\s*\|\s*/g, " > ")
    .replace(/\s*>\s*/g, " > ")
    .replace(/\s+/g, " ")
    .trim();
}

function wrapValueForCell(
  doc: jsPDF,
  value: string,
  maxWidthPt: number,
): string {
  const safe = pdfSafeText(value);
  const lines = doc.splitTextToSize(safe, Math.max(24, maxWidthPt));
  return Array.isArray(lines) ? lines.join("\n") : safe;
}

function lastTableY(doc: jsPDF, fallback: number): number {
  return (
    (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? fallback
  );
}

export function downloadCalculatorPdf(data: PdfReportData) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2;
  const labelW = 48;
  const valueW = contentWidth - labelW;
  const hasDiagram = Boolean(data.diagramImageDataUrl);
  // Compact header/gaps when a diagram must stay on page 1 with tables.
  const headerEndY = hasDiagram ? 34 : 42;
  const tableGap = hasDiagram ? 5 : 8;
  const cellFont = hasDiagram ? 8 : 9;

  doc.setFontSize(hasDiagram ? 13 : 16);
  doc.text("FieldEngineersKit", marginX, hasDiagram ? 12 : 18);
  doc.setFontSize(hasDiagram ? 11 : 12);
  doc.text(data.title, marginX, hasDiagram ? 20 : 28);

  let metaY = hasDiagram ? 26 : 35;
  if (data.standard) {
    doc.setFontSize(9);
    doc.setTextColor(90, 98, 112);
    doc.text(`Standard: ${data.standard}`, marginX, metaY);
    doc.setTextColor(0, 0, 0);
    metaY += 5;
  }

  doc.setFontSize(8);
  doc.setTextColor(138, 144, 156);
  doc.text(`Generated: ${data.generatedAt}`, marginX, metaY);
  doc.setTextColor(0, 0, 0);

  const tableStyles = {
    fontSize: cellFont,
    overflow: "linebreak" as const,
    cellPadding: hasDiagram ? 1.8 : 2.5,
    valign: "top" as const,
  };
  const columnStyles = {
    0: { cellWidth: labelW, fontStyle: "bold" as const },
    1: { cellWidth: valueW, overflow: "linebreak" as const },
  };

  autoTable(doc, {
    startY: headerEndY,
    head: [["Input Parameter", "Value"]],
    body: data.inputs.map((row) => [
      row.label,
      wrapValueForCell(doc, row.value, valueW - 6),
    ]),
    theme: "grid",
    headStyles: { fillColor: [61, 90, 254], fontSize: cellFont },
    styles: tableStyles,
    columnStyles,
    tableWidth: contentWidth,
    margin: { left: marginX, right: marginX },
  });

  let cursorY = lastTableY(doc, headerEndY) + tableGap;

  if (data.diagramImageDataUrl) {
    const caption = data.diagramCaption ?? "Bolt numbering (clockwise from top)";
    // Keep diagram modest so inputs + diagram + results fit on one page.
    const imgMaxW = Math.min(68, contentWidth * 0.42);
    const imgMaxH = 68;
    let imgW = imgMaxW;
    let imgH = imgMaxH;

    try {
      const props = doc.getImageProperties(data.diagramImageDataUrl);
      const ratio = props.width / Math.max(props.height, 1);
      if (ratio >= 1) {
        imgW = imgMaxW;
        imgH = imgMaxW / ratio;
      } else {
        imgH = imgMaxH;
        imgW = imgMaxH * ratio;
      }
    } catch {
      /* keep defaults */
    }

    doc.setFontSize(9);
    doc.setTextColor(40, 48, 60);
    doc.text(caption, marginX, cursorY + 3);
    cursorY += 5;

    const imgX = marginX + (contentWidth - imgW) / 2;
    doc.addImage(
      data.diagramImageDataUrl,
      "PNG",
      imgX,
      cursorY,
      imgW,
      imgH,
    );
    cursorY += imgH + tableGap;
    doc.setTextColor(0, 0, 0);
  }

  autoTable(doc, {
    startY: cursorY,
    head: [["Result", "Value"]],
    body: data.results.map((row) => [
      row.label,
      wrapValueForCell(doc, row.value, valueW - 6),
    ]),
    theme: "grid",
    headStyles: { fillColor: [28, 138, 90], fontSize: cellFont },
    styles: tableStyles,
    columnStyles,
    tableWidth: contentWidth,
    margin: { left: marginX, right: marginX },
  });

  cursorY = lastTableY(doc, cursorY) + (hasDiagram ? 6 : 8);

  const noticeLines = doc.splitTextToSize(
    CALCULATOR_RESULT_NOTICE,
    contentWidth,
  );
  const noticeBlockH =
    4 + noticeLines.length * 3.4 + 8;
  if (cursorY + noticeBlockH > pageHeight - 12) {
    // Prefer shrinking footer space over a nearly blank page 2.
    if (!hasDiagram) {
      doc.addPage();
      cursorY = 20;
    } else {
      cursorY = Math.min(cursorY, pageHeight - noticeBlockH - 4);
    }
  }

  doc.setFontSize(7);
  doc.setTextColor(138, 144, 156);
  doc.text(noticeLines, marginX, cursorY + 3);
  doc.text(
    "This report is for engineering estimation purposes only.",
    marginX,
    pageHeight - 8,
  );

  const filename = `${data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-report.pdf`;
  doc.save(filename);
}

export function copyResultsTable(rows: { label: string; value: string }[]) {
  const text = rows.map((row) => `${row.label}\t${row.value}`).join("\n");
  return navigator.clipboard.writeText(text);
}

export function downloadResultsCsv(
  title: string,
  rows: { label: string; value: string }[],
) {
  const header = "Parameter,Value\n";
  const body = rows.map((row) => `"${row.label}","${row.value}"`).join("\n");
  const blob = new Blob([header + body], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
