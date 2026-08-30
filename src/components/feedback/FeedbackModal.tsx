"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { CONTACT_EMAIL } from "@/lib/legal/constants";
import { useToast } from "@/components/ui/ToastProvider";
import { trackFeedbackSubmit, trackEvent } from "@/lib/analytics/events";
import type { Calculator } from "@/lib/calculators/types";

type FeedbackModalProps = {
  calculators?: Calculator[];
};

export default function FeedbackModal({ calculators = [] }: FeedbackModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<"bug" | "improvement" | "other">("bug");
  const [calculatorName, setCalculatorName] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const pathname = usePathname();
  const { showToast } = useToast();

  // 현재 방문 중인 페이지가 계산기 페이지면 기본 계산기명을 자동 매칭
  useEffect(() => {
    if (pathname.startsWith("/calculator/")) {
      const slug = pathname.split("/")[2];
      const matched = calculators.find((c) => c.slug === slug);
      if (matched) {
        setCalculatorName(matched.title);
      } else if (slug) {
        setCalculatorName(slug);
      }
    } else {
      setCalculatorName("General (All Calculators / UI)");
    }
  }, [pathname, calculators, isOpen]);

  const handleOpen = () => {
    setIsOpen(true);
    setIsSuccess(false);
    trackEvent("open_feedback_modal", { pathname });
  };

  const handleClose = () => {
    setIsOpen(false);
    setIsSuccess(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      showToast("Please enter your feedback message.");
      return;
    }

    setIsSubmitting(true);

    trackFeedbackSubmit({
      feedback_type: feedbackType,
      calculator_name: calculatorName,
      has_message: true,
    });

    const subject = encodeURIComponent(
      `[FEK Feedback - ${feedbackType.toUpperCase()}] ${calculatorName}`
    );
    const body = encodeURIComponent(
      `Feedback Type: ${feedbackType}\nCalculator/Page: ${calculatorName}\nURL: ${window.location.href}\n\nMessage:\n${message}`
    );

    // mailto를 트리거하여 기본 메일 앱으로 발송 연동
    const mailtoUrl = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
    window.location.href = mailtoUrl;

    setIsSubmitting(false);
    setIsSuccess(true);
    showToast("Opening email client to submit your feedback. Thank you!");
    setTimeout(() => {
      handleClose();
      setMessage("");
    }, 2000);
  };

  if (pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <>
      {/* 1. Floating Feedback Button (우측 하단 고정) */}
      <div className="fixed bottom-6 right-6 z-40 print:hidden">
        <button
          type="button"
          onClick={handleOpen}
          aria-label="Send Feedback"
          className="group flex items-center gap-2 rounded-full border border-slate-300/80 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600 hover:shadow-xl dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-blue-400 dark:hover:bg-slate-700 dark:hover:text-blue-400 md:text-sm"
        >
          <svg
            className="h-4 w-4 text-blue-600 transition-transform group-hover:scale-110 dark:text-blue-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
            />
          </svg>
          <span>Feedback</span>
        </button>
      </div>

      {/* 2. Modal Form */}
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="fixed inset-0"
            aria-hidden="true"
            onClick={handleClose}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="feedback-modal-title"
            className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                  💬
                </span>
                <div>
                  <h2
                    id="feedback-modal-title"
                    className="text-lg font-bold text-slate-900 dark:text-slate-100"
                  >
                    Engineering Feedback
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Report calculation bugs or suggest tool improvements
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                aria-label="Close feedback modal"
              >
                ✕
              </button>
            </div>

            {/* Form Body */}
            {isSuccess ? (
              <div className="py-8 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-xl text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                  ✓
                </div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Thank You for Your Feedback!
                </h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  Opening your email client to send the report to our engineering team.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                {/* 1. Calculator Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Calculator / Topic
                  </label>
                  <select
                    value={calculatorName}
                    onChange={(e) => setCalculatorName(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <option value="General (All Calculators / UI)">
                      General (Site UI / All Calculators)
                    </option>
                    {calculators.map((c) => (
                      <option key={c.slug} value={c.title}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Feedback Type */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Feedback Type
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setFeedbackType("bug")}
                      className={`rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                        feedbackType === "bug"
                          ? "border-red-500 bg-red-50 text-red-700 font-semibold dark:border-red-600 dark:bg-red-950/40 dark:text-red-300"
                          : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300"
                      }`}
                    >
                      🚨 Bug / Error
                    </button>
                    <button
                      type="button"
                      onClick={() => setFeedbackType("improvement")}
                      className={`rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                        feedbackType === "improvement"
                          ? "border-blue-500 bg-blue-50 text-blue-700 font-semibold dark:border-blue-600 dark:bg-blue-950/40 dark:text-blue-300"
                          : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300"
                      }`}
                    >
                      💡 Improvement
                    </button>
                    <button
                      type="button"
                      onClick={() => setFeedbackType("other")}
                      className={`rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                        feedbackType === "other"
                          ? "border-emerald-500 bg-emerald-50 text-emerald-700 font-semibold dark:border-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300"
                          : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300"
                      }`}
                    >
                      💬 Question / Other
                    </button>
                  </div>
                </div>

                {/* 3. Message */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Message / Formula Discrepancy
                  </label>
                  <textarea
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Describe any formula issues, calculation discrepancy, missing ASME/API spec, or new feature ideas..."
                    className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-800 shadow-xs placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500"
                    required
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                  >
                    {isSubmitting ? "Submitting..." : "Send Feedback"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
