import { useMemo } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { tFor, localeForLanguage } from '@/lib/i18n/translations';

export function useI18n() {
  const languageCode = useAuthStore((s) => s.languageCode);

  const t = useMemo(() => {
    return (key: string): string => tFor(languageCode, key);
  }, [languageCode]);

  const locale = useMemo(() => localeForLanguage(languageCode), [languageCode]);

  return { t, locale, languageCode };
}
