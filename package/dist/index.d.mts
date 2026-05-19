interface UseLocalStorageStateOptions<T> {
    ttl?: number;
    encrypt?: (raw: string) => string;
    decrypt?: (raw: string) => string;
    serializer?: {
        stringify: (v: T) => string;
        parse: (s: string) => T;
    };
}
type SetValue<T> = (v: T | ((prev: T) => T)) => void;
declare function useLocalStorageState<T>(key: string, initialValue: T, options?: UseLocalStorageStateOptions<T>): [T, SetValue<T>, () => void];

export { type SetValue, type UseLocalStorageStateOptions, useLocalStorageState };
