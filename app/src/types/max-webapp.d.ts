interface MaxWebApp {
    initData: string;
    initDataUnsafe: {
        query_id?: string;
        user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            language_code?: string;
            photo_url?: string;
        };
        chat?: { id: number; type: string };
        auth_date: number;
        hash: string;
        start_param?: string;
    };
    platform: string;
    ready(): void;
    close(): void;
    openLink(url: string): void;
    openMaxLink(url: string): void;
    requestContact(): Promise<{ phone: string }>;
    BackButton: {
        show(): void;
        hide(): void;
        onClick(cb: () => void): void;
        offClick(cb: () => void): void;
    };
    HapticFeedback: {
        impactOccurred(style: string): void;
        notificationOccurred(type: string): void;
        selectionChanged(): void;
    };
    disableVerticalSwipes?(): void;
    enableVerticalSwipes?(): void;
}

interface Window {
    WebApp?: MaxWebApp;
}
