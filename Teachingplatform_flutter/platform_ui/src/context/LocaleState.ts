import { createContext, useContext } from "react";

type Locale = "en";

export const LocaleContext = createContext({
  locale: "en" as Locale,
  tx: (english: string, arabic: string) => { void arabic; return english; },
});

export function useLocale() {
  return useContext(LocaleContext);
}
