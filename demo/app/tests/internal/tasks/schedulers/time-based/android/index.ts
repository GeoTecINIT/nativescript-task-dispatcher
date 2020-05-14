export function createOsAlarmManagerMock(): android.app.AlarmManager {
    const alarmManager = {
        setRepeating(
            p0: number,
            p1: number,
            p2: number,
            p3: android.app.PendingIntent
        ): void {
            return;
        },
        setExactAndAllowWhileIdle(
            p0: number,
            p1: number,
            p2: android.app.PendingIntent
        ): void {
            return;
        },
        setExact(p0: number, p1: number, p2: android.app.PendingIntent): void {
            return;
        },
        set(p0: number, p1: number, p2: android.app.PendingIntent): void {
            return;
        },
        cancel(p0: android.app.PendingIntent): void {
            return;
        },
    };

    return alarmManager as android.app.AlarmManager;
}
