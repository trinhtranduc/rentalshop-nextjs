import type { PublicLocale } from '@rentalshop/constants';
import vi from '../../../../locales/vi/public.json';
import en from '../../../../locales/en/public.json';
import ja from '../../../../locales/ja/public.json';
import ko from '../../../../locales/ko/public.json';
import zh from '../../../../locales/zh/public.json';
import ru from '../../../../locales/ru/public.json';
import zhTW from '../../../../locales/zh-TW/public.json';
import fr from '../../../../locales/fr/public.json';
import de from '../../../../locales/de/public.json';
import th from '../../../../locales/th/public.json';
import id from '../../../../locales/id/public.json';
import es from '../../../../locales/es/public.json';

export type PublicMessages = typeof vi;
const messages: Record<PublicLocale, PublicMessages> = { vi, en, ja, ko, zh, ru, 'zh-TW': zhTW, fr, de, th, id, es };
export function publicMessages(locale: PublicLocale): PublicMessages { return messages[locale]; }
