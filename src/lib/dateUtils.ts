import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { Language } from "@/i18n/translations";

export const getDateLocale = (language: Language) => {
  return language === "fr" ? fr : enUS;
};

export const formatLongDate = (date: string | Date, language: Language) => {
  return format(new Date(date), "dd MMMM yyyy", { locale: getDateLocale(language) });
};

export const formatShortDate = (date: string | Date, language: Language) => {
  return format(new Date(date), "dd MMM yyyy", { locale: getDateLocale(language) });
};

export const formatTime = (date: string | Date, language: Language) => {
  return format(new Date(date), "HH'h'mm", { locale: getDateLocale(language) });
};

export const formatDay = (date: string | Date, language: Language) => {
  return format(new Date(date), "dd", { locale: getDateLocale(language) });
};

export const formatMonth = (date: string | Date, language: Language) => {
  return format(new Date(date), "MMMM", { locale: getDateLocale(language) });
};

export const formatYear = (date: string | Date, language: Language) => {
  return format(new Date(date), "yyyy", { locale: getDateLocale(language) });
};
