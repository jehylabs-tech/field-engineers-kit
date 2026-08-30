import { Suspense } from "react";

export default function CalculatorLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <Suspense fallback={null}>{children}</Suspense>;
}
