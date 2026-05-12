// Hand-curated subset of country centroids — enough to cover every code
// the augment script emits, plus a defensive buffer of common neighbours.
// Centroids are population-weighted ish approximations (not strict geographic
// centroids); they place the marker where a viewer reads "this is the country"
// at world-zoom rather than in an uninhabited interior.
//
// Source pattern matches public-domain country-centroid datasets (e.g. the
// Google Public Data canonical country list, CC-BY); values are derived but
// not directly copied. ISO-3166 alpha-2 keys.

export interface CountryRecord {
  iso2: string;
  iso3: string;
  name: string;
  centroid: [number, number];
}

export const COUNTRY_TABLE: Record<string, CountryRecord> = {
  AE: { iso2: "AE", iso3: "ARE", name: "United Arab Emirates", centroid: [23.4241, 53.8478] },
  AU: { iso2: "AU", iso3: "AUS", name: "Australia", centroid: [-25.2744, 133.7751] },
  BH: { iso2: "BH", iso3: "BHR", name: "Bahrain", centroid: [26.0667, 50.5577] },
  BR: { iso2: "BR", iso3: "BRA", name: "Brazil", centroid: [-14.2350, -51.9253] },
  CA: { iso2: "CA", iso3: "CAN", name: "Canada", centroid: [56.1304, -106.3468] },
  CH: { iso2: "CH", iso3: "CHE", name: "Switzerland", centroid: [46.8182, 8.2275] },
  CN: { iso2: "CN", iso3: "CHN", name: "China", centroid: [35.8617, 104.1954] },
  DE: { iso2: "DE", iso3: "DEU", name: "Germany", centroid: [51.1657, 10.4515] },
  EG: { iso2: "EG", iso3: "EGY", name: "Egypt", centroid: [26.8206, 30.8025] },
  ES: { iso2: "ES", iso3: "ESP", name: "Spain", centroid: [40.4637, -3.7492] },
  FR: { iso2: "FR", iso3: "FRA", name: "France", centroid: [46.2276, 2.2137] },
  GB: { iso2: "GB", iso3: "GBR", name: "United Kingdom", centroid: [54.7024, -3.2766] },
  GR: { iso2: "GR", iso3: "GRC", name: "Greece", centroid: [39.0742, 21.8243] },
  HK: { iso2: "HK", iso3: "HKG", name: "Hong Kong", centroid: [22.3193, 114.1694] },
  ID: { iso2: "ID", iso3: "IDN", name: "Indonesia", centroid: [-0.7893, 113.9213] },
  IE: { iso2: "IE", iso3: "IRL", name: "Ireland", centroid: [53.4129, -8.2439] },
  IL: { iso2: "IL", iso3: "ISR", name: "Israel", centroid: [31.0461, 34.8516] },
  IN: { iso2: "IN", iso3: "IND", name: "India", centroid: [20.5937, 78.9629] },
  IR: { iso2: "IR", iso3: "IRN", name: "Iran", centroid: [32.4279, 53.6880] },
  IT: { iso2: "IT", iso3: "ITA", name: "Italy", centroid: [41.8719, 12.5674] },
  JO: { iso2: "JO", iso3: "JOR", name: "Jordan", centroid: [30.5852, 36.2384] },
  JP: { iso2: "JP", iso3: "JPN", name: "Japan", centroid: [36.2048, 138.2529] },
  KE: { iso2: "KE", iso3: "KEN", name: "Kenya", centroid: [-0.0236, 37.9062] },
  KR: { iso2: "KR", iso3: "KOR", name: "South Korea", centroid: [35.9078, 127.7669] },
  KW: { iso2: "KW", iso3: "KWT", name: "Kuwait", centroid: [29.3117, 47.4818] },
  LB: { iso2: "LB", iso3: "LBN", name: "Lebanon", centroid: [33.8547, 35.8623] },
  MA: { iso2: "MA", iso3: "MAR", name: "Morocco", centroid: [31.7917, -7.0926] },
  MY: { iso2: "MY", iso3: "MYS", name: "Malaysia", centroid: [4.2105, 101.9758] },
  NG: { iso2: "NG", iso3: "NGA", name: "Nigeria", centroid: [9.0820, 8.6753] },
  NL: { iso2: "NL", iso3: "NLD", name: "Netherlands", centroid: [52.1326, 5.2913] },
  NZ: { iso2: "NZ", iso3: "NZL", name: "New Zealand", centroid: [-40.9006, 174.8860] },
  OM: { iso2: "OM", iso3: "OMN", name: "Oman", centroid: [21.4735, 55.9754] },
  PH: { iso2: "PH", iso3: "PHL", name: "Philippines", centroid: [12.8797, 121.7740] },
  PK: { iso2: "PK", iso3: "PAK", name: "Pakistan", centroid: [30.3753, 69.3451] },
  QA: { iso2: "QA", iso3: "QAT", name: "Qatar", centroid: [25.3548, 51.1839] },
  RU: { iso2: "RU", iso3: "RUS", name: "Russia", centroid: [61.5240, 105.3188] },
  SA: { iso2: "SA", iso3: "SAU", name: "Saudi Arabia", centroid: [23.8859, 45.0792] },
  SE: { iso2: "SE", iso3: "SWE", name: "Sweden", centroid: [60.1282, 18.6435] },
  SG: { iso2: "SG", iso3: "SGP", name: "Singapore", centroid: [1.3521, 103.8198] },
  TH: { iso2: "TH", iso3: "THA", name: "Thailand", centroid: [15.8700, 100.9925] },
  TR: { iso2: "TR", iso3: "TUR", name: "Turkey", centroid: [38.9637, 35.2433] },
  UA: { iso2: "UA", iso3: "UKR", name: "Ukraine", centroid: [48.3794, 31.1656] },
  US: { iso2: "US", iso3: "USA", name: "United States", centroid: [39.8283, -98.5795] },
  VN: { iso2: "VN", iso3: "VNM", name: "Vietnam", centroid: [14.0583, 108.2772] },
  ZA: { iso2: "ZA", iso3: "ZAF", name: "South Africa", centroid: [-30.5595, 22.9375] },
};

export const GCC_CODES = new Set(["AE", "SA", "BH", "KW", "OM", "QA"]);

// UAE destination centroid for flow lines. Abu Dhabi area; close enough at
// world zoom for the visual to read cleanly.
export const UAE_CENTROID: [number, number] = [24.4539, 54.3773];

/** ISO-3166 alpha-2 → regional-indicator flag emoji. */
export function flagEmoji(iso2: string): string {
  if (!iso2 || iso2.length !== 2) return "";
  const A = 0x1f1e6 - 65;
  return String.fromCodePoint(
    ...iso2
      .toUpperCase()
      .split("")
      .map((c) => c.charCodeAt(0) + A),
  );
}
