// Глобальные типы для внешних библиотек

declare global {
  interface Window {
    Tawk_API: {
      setAttributes: (attributes: Record<string, any>) => void;
      showWidget: () => void;
      hideWidget: () => void;
      onLoad: () => void;
      onError: (error: any) => void;
      isLoaded: boolean;
    };
    Tawk_LoadStart: Date;
  }
}

export {};
