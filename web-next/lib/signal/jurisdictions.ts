/**
 * Short, alphabetised list of jurisdictions used by the /signal/start
 * dropdowns. Curated to cover common UK immigration origin/destination
 * jurisdictions; "Other" is the catch-all so the dropdown stays scannable.
 */
export const JURISDICTIONS: readonly string[] = [
  "Afghanistan",
  "Argentina",
  "Australia",
  "Bangladesh",
  "Brazil",
  "Canada",
  "China",
  "Colombia",
  "Egypt",
  "France",
  "Germany",
  "Ghana",
  "Hong Kong",
  "India",
  "Indonesia",
  "Iran",
  "Iraq",
  "Italy",
  "Japan",
  "Kenya",
  "Malaysia",
  "Mexico",
  "Nepal",
  "Nigeria",
  "Pakistan",
  "Philippines",
  "Poland",
  "Russia",
  "Saudi Arabia",
  "Singapore",
  "South Africa",
  "South Korea",
  "Spain",
  "Sri Lanka",
  "Syria",
  "Turkey",
  "Ukraine",
  "United Arab Emirates",
  "United Kingdom",
  "United States",
  "Venezuela",
  "Vietnam",
  "Zimbabwe",
  "Other",
] as const;

export const BACKGROUNDS: readonly string[] = [
  "Founder",
  "Employee",
  "Student",
  "Professional",
  "Investor",
  "Other",
] as const;

export const PURPOSES: readonly string[] = [
  "Business",
  "Work",
  "Study",
  "Family",
  "Retirement",
  "Other",
] as const;
