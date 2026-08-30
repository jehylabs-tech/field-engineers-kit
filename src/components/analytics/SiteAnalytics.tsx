import { Analytics as VercelAnalytics } from "@vercel/analytics/react";
import GoogleAnalytics from "./GoogleAnalytics";
import ClarityAnalytics from "./ClarityAnalytics";

export default function SiteAnalytics() {
  const enableVercelAnalytics =
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PUBLIC_VERCEL_ANALYTICS !== "false";

  return (
    <>
      {enableVercelAnalytics ? <VercelAnalytics /> : null}
      <GoogleAnalytics />
      <ClarityAnalytics />
    </>
  );
}
