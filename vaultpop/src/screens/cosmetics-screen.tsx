import { Redirect } from "expo-router";

/**
 * Arcade Styles now lives inside the Shop as "Styles & Customization".
 * This compatibility route keeps every old /cosmetics link working.
 */
export function CosmeticsScreen() {
  return <Redirect href="/shop" />;
}
