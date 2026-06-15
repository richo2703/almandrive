interface TelegramWebApp {
  initData: string;
  ready(): void;
  expand(): void;
  close(): void;
  openInvoice(url: string, callback?: (status: string) => void): void;
  colorScheme: "light" | "dark";
}

interface Window {
  Telegram?: { WebApp: TelegramWebApp };
}
