"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { ANALYTICS_ENABLED, GA_ID, pageView } from "@/lib/analytics";

/**
 * GA4 loader.
 *
 * Consent Mode defaults are set *before* the GA script runs, so the first
 * request already carries denied state. The cookie banner later upgrades it
 * with `consent update` if the visitor agrees.
 *
 * Renders nothing at all when NEXT_PUBLIC_GA_ID is unset.
 */
export function Analytics() {
  const pathname = usePathname();

  useEffect(() => {
    if (!ANALYTICS_ENABLED) return;
    pageView(pathname);
  }, [pathname]);

  if (!ANALYTICS_ENABLED) return null;

  // One script, in one order: consent defaults are pushed onto the dataLayer
  // before the GA tag is injected, so the very first measurement request
  // already carries the denied state. Loading the tag from inside this script
  // (rather than as a separate <Script src>) is what guarantees that ordering
  // without needing the beforeInteractive strategy.
  return (
    <Script id="bds-ga" strategy="afterInteractive">
      {`
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}

        gtag('consent', 'default', {
          ad_storage: 'denied',
          ad_user_data: 'denied',
          ad_personalization: 'denied',
          analytics_storage: 'denied',
          functionality_storage: 'granted',
          security_storage: 'granted',
          wait_for_update: 500
        });

        gtag('js', new Date());
        gtag('config', '${GA_ID}', { send_page_view: true });

        var s = document.createElement('script');
        s.async = true;
        s.src = 'https://www.googletagmanager.com/gtag/js?id=${GA_ID}';
        document.head.appendChild(s);
      `}
    </Script>
  );
}
