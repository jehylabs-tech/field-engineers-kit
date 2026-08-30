type GtagParams = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (command: string, eventName: string, params?: GtagParams) => void;
    clarity?: (...args: unknown[]) => void;
  }
}

export function trackEvent(eventName: string, params?: GtagParams) {
  if (typeof window === "undefined") return;
  if (typeof window.gtag === "function") {
    window.gtag("event", eventName, params);
  }
  if (typeof window.clarity === "function") {
    try {
      window.clarity("event", eventName);
    } catch {
      // ignore
    }
  }
}

/** GA4 custom event: calculation execution in calculator */
export function trackCalculate(
  calculatorId: string,
  extraParams?: GtagParams,
) {
  if (!calculatorId) return;
  trackEvent("calculate", {
    calculator_id: calculatorId,
    ...extraParams,
  });
}

/** GA4 custom event: export PDF or Excel */
export function trackExport(
  calculatorId: string,
  format: "pdf" | "excel" | "csv",
  fileName?: string,
) {
  if (!calculatorId) return;
  trackEvent("export_report", {
    calculator_id: calculatorId,
    export_format: format,
    file_name: fileName,
  });
  trackEvent(format === "pdf" ? "export_pdf" : "export_excel", {
    calculator_id: calculatorId,
    file_name: fileName,
  });
}

/** GA4 custom event: copy calculation result or table */
export function trackCopyResult(
  calculatorId: string,
  extraParams?: GtagParams,
) {
  if (!calculatorId) return;
  trackEvent("copy_result", {
    calculator_id: calculatorId,
    ...extraParams,
  });
}

/** GA4 custom event: feedback submission */
export function trackFeedbackSubmit(params: {
  feedback_type: string;
  calculator_name?: string;
  has_message: boolean;
}) {
  trackEvent("feedback_submit", params);
}

type SearchFeedbackPayload = {
  type: "search_no_results" | "calculator_requested";
  query: string;
  priority?: "high";
  source?: string;
};

async function postSearchFeedback(payload: SearchFeedbackPayload) {
  try {
    await fetch("/api/search-feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    // Analytics must not break search UX.
  }
}

/** GA4 + custom log for queries that yield zero calculator matches. */
export function trackSearchNoResults(query: string, source = "command-palette") {
  const trimmed = query.trim();
  if (!trimmed) return;
  trackEvent("search_no_results", {
    query: trimmed,
    search_term: trimmed,
    source,
  });
  void postSearchFeedback({
    type: "search_no_results",
    query: trimmed,
    source,
  });
}

/** High-priority feature request when user clicks the zero-result CTA. */
export function trackCalculatorRequested(
  query: string,
  source = "command-palette",
) {
  const trimmed = query.trim();
  if (!trimmed) return;
  trackEvent("calculator_requested", {
    query: trimmed,
    search_term: trimmed,
    priority: "high",
    source,
  });
  void postSearchFeedback({
    type: "calculator_requested",
    query: trimmed,
    priority: "high",
    source,
  });
}
