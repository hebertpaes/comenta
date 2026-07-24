/**
 * Horário de atendimento. `schedule` = { enabled, days:[1..7], start:"HH:MM",
 * end:"HH:MM", message }. 1=segunda … 7=domingo.
 */
export type Schedule = {
  enabled?: boolean;
  days?: number[];
  start?: string;
  end?: string;
  message?: string;
};

/** true se AGORA está dentro do horário de atendimento definido.
 *  Se a agenda não estiver habilitada, considera sempre aberto (true). */
export function isOpenNow(schedule: Schedule | null | undefined, now = new Date()): boolean {
  if (!schedule || !schedule.enabled) return true;
  const day = now.getDay() === 0 ? 7 : now.getDay(); // 1=seg … 7=dom
  const days = Array.isArray(schedule.days) && schedule.days.length ? schedule.days : [1, 2, 3, 4, 5];
  if (!days.includes(day)) return false;
  const [sh, sm] = String(schedule.start ?? "09:00").split(":").map(Number);
  const [eh, em] = String(schedule.end ?? "18:00").split(":").map(Number);
  const mins = now.getHours() * 60 + now.getMinutes();
  return mins >= sh * 60 + sm && mins < eh * 60 + em;
}
