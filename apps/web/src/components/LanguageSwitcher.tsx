import { useTranslation } from "react-i18next";

const languages = [
  { code: "en", label: "EN", flag: "🇬🇧" },
  { code: "fr", label: "FR", flag: "🇫🇷" },
  { code: "ar", label: "ع", flag: "🇲🇦" },
] as const;

export function LanguageSwitcher({ collapsed = false }: { collapsed?: boolean }) {
  const { i18n } = useTranslation();

  return (
    <div
      className={`flex ${collapsed ? "flex-col gap-1" : "gap-0.5"} rounded-btn p-0.5 bg-surface-alt`}
      style={{ boxShadow: "inset 0 1px 2px rgba(0,0,0,0.06)" }}
      role="radiogroup"
      aria-label="Language selection"
    >
      {languages.map(({ code, label }) => (
        <button
          key={code}
          onClick={() => i18n.changeLanguage(code)}
          className={`flex items-center justify-center gap-1 rounded-[0.4rem] px-2.5 py-1.5 text-[11px] font-mono font-medium transition-all duration-200
            ${i18n.language === code
              ? "bg-accent text-white dark:text-[#080b12] shadow-sm"
              : "text-t-tertiary hover:text-t-secondary"
            }
            ${collapsed ? "w-full" : ""}
          `}
          type="button"
          role="radio"
          aria-checked={i18n.language === code}
          aria-label={code === "ar" ? "العربية" : code === "fr" ? "Français" : "English"}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
