import { useLanguage } from '@/i18n/LanguageContext';

const LanguageSelector = () => {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => setLanguage('pt')}
        className={`w-7 h-5 rounded-sm overflow-hidden border-2 transition-all ${
          language === 'pt' ? 'border-primary shadow-md scale-110' : 'border-transparent opacity-60 hover:opacity-100'
        }`}
        title="Português"
        aria-label="Português"
      >
        <svg viewBox="0 0 28 20" className="w-full h-full">
          <rect width="28" height="20" fill="#009c3b" />
          <polygon points="14,2 26,10 14,18 2,10" fill="#ffdf00" />
          <circle cx="14" cy="10" r="4.5" fill="#002776" />
          <path d="M9.5,10 Q14,7 18.5,10" fill="none" stroke="#fff" strokeWidth="0.5" />
        </svg>
      </button>
      <button
        onClick={() => setLanguage('en')}
        className={`w-7 h-5 rounded-sm overflow-hidden border-2 transition-all ${
          language === 'en' ? 'border-primary shadow-md scale-110' : 'border-transparent opacity-60 hover:opacity-100'
        }`}
        title="English"
        aria-label="English"
      >
        <svg viewBox="0 0 28 20" className="w-full h-full">
          <rect width="28" height="20" fill="#b22234" />
          <rect y="1.54" width="28" height="1.54" fill="#fff" />
          <rect y="4.62" width="28" height="1.54" fill="#fff" />
          <rect y="7.69" width="28" height="1.54" fill="#fff" />
          <rect y="10.77" width="28" height="1.54" fill="#fff" />
          <rect y="13.85" width="28" height="1.54" fill="#fff" />
          <rect y="16.92" width="28" height="1.54" fill="#fff" />
          <rect width="11.2" height="10.77" fill="#3c3b6e" />
        </svg>
      </button>
    </div>
  );
};

export default LanguageSelector;
