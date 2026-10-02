import { cookies, headers } from "next/headers";
import { LOCALE_COOKIE, resolveLocale } from "./locale";

/** The locale for the current request, in server components and route handlers. */
export async function requestLocale() {
  const [jar, list] = await Promise.all([cookies(), headers()]);
  return resolveLocale(
    jar.get(LOCALE_COOKIE)?.value,
    list.get("accept-language"),
  );
}
