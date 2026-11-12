/** Client-side form rules. They mirror the API's validators, which remain the authority. */
export type Errors<T> = Partial<Record<keyof T, string>>;

export const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());

export function passwordProblem(value: string): string | null {
  if (value.length < 10) return "10 caractères minimum";
  if (!/[a-z]/.test(value)) return "Ajoutez une minuscule";
  if (!/[A-Z]/.test(value)) return "Ajoutez une majuscule";
  if (!/\d/.test(value)) return "Ajoutez un chiffre";
  return null;
}

export const PASSWORD_HINT = "10 caractères minimum, avec une majuscule, une minuscule et un chiffre.";

export function hasErrors<T>(errors: Errors<T>): boolean {
  return Object.values(errors).some(Boolean);
}
