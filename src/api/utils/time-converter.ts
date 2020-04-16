export type TimeUnit = 'seconds' | 'minutes' | 'hours' | 'days';

export function toSeconds(amount: number, unit: TimeUnit) {
    switch (unit) {
        case 'seconds':
            return amount;
        case 'minutes':
            return amount * 60;
        case 'hours':
            return amount * 60 * 60;
        case 'days':
            return amount * 60 * 60 * 24;
    }
}
