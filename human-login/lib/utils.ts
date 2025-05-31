import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// export const isRegistered = (): boolean => {
//   const faceCredentials = localStorage.getItem('faceCredentials');
//   return faceCredentials !== null;
// };