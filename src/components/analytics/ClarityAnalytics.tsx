import Script from "next/script";

type ClarityAnalyticsProps = {
  clarityId?: string;
};

export default function ClarityAnalytics({
  clarityId = process.env.NEXT_PUBLIC_CLARITY_ID || "yai3eq242v",
}: ClarityAnalyticsProps) {
  if (!clarityId) return null;

  return (
    <Script id="microsoft-clarity" strategy="afterInteractive">
      {`
        (function(c,l,a,r,i,t,y){
            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
        })(window, document, "clarity", "script", "${clarityId}");
      `}
    </Script>
  );
}
