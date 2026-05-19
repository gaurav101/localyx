export const rot13 = (str: string): string => {
  return str.replace(/[a-zA-Z]/g, (char) => {
    const start = char <= 'Z' ? 65 : 97;
    return String.fromCharCode(start + ((char.charCodeAt(0) - start + 13) % 26));
  });
};

export const customEncrypt = (raw: string): string => btoa(rot13(raw));
export const customDecrypt = (raw: string): string => rot13(atob(raw));
