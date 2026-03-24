import { useMemo } from 'react';

// Map of country names (Portuguese) to ISO 3166-1 alpha-2 codes
const COUNTRY_CODES: Record<string, string> = {
  'Afeganistão': 'AF', 'África do Sul': 'ZA', 'Albânia': 'AL', 'Alemanha': 'DE',
  'Andorra': 'AD', 'Angola': 'AO', 'Arábia Saudita': 'SA', 'Argélia': 'DZ',
  'Argentina': 'AR', 'Armênia': 'AM', 'Austrália': 'AU', 'Áustria': 'AT',
  'Azerbaijão': 'AZ', 'Bahrain': 'BH', 'Bangladesh': 'BD', 'Bélgica': 'BE',
  'Benin': 'BJ', 'Bielorrússia': 'BY', 'Bolívia': 'BO', 'Bósnia': 'BA',
  'Botsuana': 'BW', 'Brasil': 'BR', 'Bulgária': 'BG', 'Burkina Faso': 'BF',
  'Burundi': 'BI', 'Cabo Verde': 'CV', 'Camarões': 'CM', 'Camboja': 'KH',
  'Canadá': 'CA', 'Catar': 'QA', 'Cazaquistão': 'KZ', 'Chade': 'TD',
  'Chile': 'CL', 'China': 'CN', 'Chipre': 'CY', 'Colômbia': 'CO',
  'Comores': 'KM', 'Congo': 'CG', 'Coreia do Norte': 'KP', 'Coreia do Sul': 'KR',
  'Costa do Marfim': 'CI', 'Costa Rica': 'CR', 'Croácia': 'HR', 'Cuba': 'CU',
  'Dinamarca': 'DK', 'Egito': 'EG', 'El Salvador': 'SV', 'Emirados Árabes': 'AE',
  'Equador': 'EC', 'Escócia': 'GB-SCT', 'Eslováquia': 'SK', 'Eslovênia': 'SI',
  'Espanha': 'ES', 'Estados Unidos': 'US', 'EUA': 'US', 'Estônia': 'EE',
  'Etiópia': 'ET', 'Fiji': 'FJ', 'Filipinas': 'PH', 'Finlândia': 'FI',
  'França': 'FR', 'Gabão': 'GA', 'Gâmbia': 'GM', 'Gana': 'GH',
  'Geórgia': 'GE', 'Grécia': 'GR', 'Guatemala': 'GT', 'Guiné': 'GN',
  'Haiti': 'HT', 'Holanda': 'NL', 'Honduras': 'HN', 'Hungria': 'HU',
  'Iêmen': 'YE', 'Índia': 'IN', 'Indonésia': 'ID', 'Inglaterra': 'GB-ENG',
  'Irã': 'IR', 'Iraque': 'IQ', 'Irlanda': 'IE', 'Islândia': 'IS',
  'Israel': 'IL', 'Itália': 'IT', 'Jamaica': 'JM', 'Japão': 'JP',
  'Jordânia': 'JO', 'Kosovo': 'XK', 'Kuwait': 'KW', 'Letônia': 'LV',
  'Líbano': 'LB', 'Líbia': 'LY', 'Lituânia': 'LT', 'Luxemburgo': 'LU',
  'Macedônia do Norte': 'MK', 'Madagascar': 'MG', 'Malásia': 'MY', 'Mali': 'ML',
  'Malta': 'MT', 'Marrocos': 'MA', 'Maurício': 'MU', 'Mauritânia': 'MR',
  'México': 'MX', 'Moçambique': 'MZ', 'Moldávia': 'MD', 'Mongólia': 'MN',
  'Montenegro': 'ME', 'Namíbia': 'NA', 'Nepal': 'NP', 'Nicarágua': 'NI',
  'Nigéria': 'NG', 'Níger': 'NE', 'Noruega': 'NO', 'Nova Zelândia': 'NZ',
  'Omã': 'OM', 'Países Baixos': 'NL', 'Panamá': 'PA', 'Paquistão': 'PK',
  'Paraguai': 'PY', 'País de Gales': 'GB-WLS', 'Gales': 'GB-WLS',
  'Peru': 'PE', 'Polônia': 'PL', 'Portugal': 'PT', 'Quênia': 'KE',
  'RD Congo': 'CD', 'Rep. Dominicana': 'DO', 'República Checa': 'CZ',
  'República Tcheca': 'CZ', 'Romênia': 'RO', 'Rússia': 'RU', 'Ruanda': 'RW',
  'Senegal': 'SN', 'Serra Leoa': 'SL', 'Sérvia': 'RS', 'Singapura': 'SG',
  'Síria': 'SY', 'Somália': 'SO', 'Sri Lanka': 'LK', 'Suazilândia': 'SZ',
  'Sudão': 'SD', 'Suécia': 'SE', 'Suíça': 'CH', 'Suriname': 'SR',
  'Tailândia': 'TH', 'Taiwan': 'TW', 'Tanzânia': 'TZ', 'Togo': 'TG',
  'Trinidad e Tobago': 'TT', 'Tunísia': 'TN', 'Turquia': 'TR',
  'Ucrânia': 'UA', 'Uganda': 'UG', 'Uruguai': 'UY', 'Uzbequistão': 'UZ',
  'Venezuela': 'VE', 'Vietnã': 'VN', 'Zâmbia': 'ZM', 'Zimbábue': 'ZW',
};

function getCountryCode(name: string): string | null {
  if (!name || name === '???' || name === 'Time A' || name === 'Time B') return null;
  const direct = COUNTRY_CODES[name];
  if (direct) return direct;
  // Try case-insensitive
  const lower = name.toLowerCase();
  for (const [key, code] of Object.entries(COUNTRY_CODES)) {
    if (key.toLowerCase() === lower) return code;
  }
  return null;
}

function getFlagUrl(code: string): string {
  // Handle UK constituent countries
  const mapped = code.toLowerCase().replace('gb-eng', 'gb-eng').replace('gb-sct', 'gb-sct').replace('gb-wls', 'gb-wls');
  if (mapped.startsWith('gb-')) {
    // Use flagcdn for UK nations
    return `https://flagcdn.com/w40/${mapped.replace('gb-', 'gb-')}.png`;
  }
  return `https://flagcdn.com/w40/${code.toLowerCase()}.png`;
}

interface TeamNameProps {
  name: string;
  /** 'left' = flag before name, 'right' = flag after name */
  side: 'left' | 'right';
  className?: string;
}

const TeamName = ({ name, side, className = '' }: TeamNameProps) => {
  const code = useMemo(() => getCountryCode(name), [name]);

  const flag = code ? (
    <img
      src={getFlagUrl(code)}
      alt={name}
      className="w-5 h-3.5 object-cover rounded-[2px] inline-block shadow-sm"
      loading="lazy"
    />
  ) : null;

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      {side === 'left' && flag}
      <span>{name}</span>
      {side === 'right' && flag}
    </span>
  );
};

export default TeamName;
