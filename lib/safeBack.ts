import { router, type Href } from 'expo-router';

/** Go back when possible; otherwise navigate to a sensible parent screen. */
export function safeGoBack(fallback: Href): void {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace(fallback);
  }
}
