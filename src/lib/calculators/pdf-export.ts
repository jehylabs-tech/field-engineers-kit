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
};

export function downloadCalculatorPdf(data: PdfReportData) {
  const doc = new jsPDF();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setFontSize(16);
  doc.text("FieldEngineersKit", 14, 18);
  doc.setFontSize(12);
  doc.text(data.title, 14, 28);

  if (data.standard) {
    doc.setFontSize(10);
    doc.setTextColor(90, 98, 112);
    doc.text(`Standard: ${data.standard}`, 14, 35);
    doc.setTextColor(0, 0, 0);
  }

  doc.setFontSize(9);
  doc.setTextColor(138, 144, 156);
  doc.text(`Generated: ${data.generatedAt}`, 14, 42);
  doc.setTextColor(0, 0, 0);

  autoTable(doc, {
    startY: 50,
    head: [["Input Parameter", "Value"]],
    body: data.inputs.map((row) => [row.label, row.value]),
    theme: "grid",
    headStyles: { fillColor: [61, 90, 254] },
    styles: { fontSize: 9 },
  });

  const finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } })
    .lastAutoTable?.finalY ?? 50;

  autoTable(doc, {
    startY: finalY + 8,
    head: [["Result", "Value"]],
    body: data.results.map((row) => [row.label, row.value]),
    theme: "grid",
    headStyles: { fillColor: [28, 138, 90] },
    styles: { fontSize: 9 },
  });

  const resultsEndY =
    (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? finalY + 8;

  doc.setFontSize(8);
  doc.setTextColor(138, 144, 156);
  const noticeLines = doc.splitTextToSize(CALCULATOR_RESULT_NOTICE, 182);
  doc.text(noticeLines, 14, resultsEndY + 12);
  doc.text(
    "This report is for engineering estimation purposes only.",
    14,
    pageHeight - 10,
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
