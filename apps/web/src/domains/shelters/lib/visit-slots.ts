/**
 * Helpers pour la gestion des créneaux de visite refuge.
 * dayOfWeek suit ISO 8601 : 1=lundi, 7=dimanche.
 */

export const DAY_LABELS_ISO = {
  1: "Lundi",
  2: "Mardi",
  3: "Mercredi",
  4: "Jeudi",
  5: "Vendredi",
  6: "Samedi",
  7: "Dimanche",
} as const;

export const DAY_LABELS_SHORT_ISO = {
  1: "Lun",
  2: "Mar",
  3: "Mer",
  4: "Jeu",
  5: "Ven",
  6: "Sam",
  7: "Dim",
} as const;

export const HALF_HOURS_FROM_8_TO_19 = (() => {
  const slots: number[] = [];
  for (let h = 8; h < 19; h++) {
    slots.push(h * 60);
    slots.push(h * 60 + 30);
  }
  return slots;
})();

export function formatMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

export function formatRange(startMinutes: number, durationMinutes = 30): string {
  return `${formatMinutes(startMinutes)} - ${formatMinutes(startMinutes + durationMinutes)}`;
}

/**
 * ISO day-of-week pour une date donnée (1=lundi, 7=dimanche).
 */
export function getIsoDayOfWeek(date: Date): number {
  const day = date.getDay();
  return day === 0 ? 7 : day;
}

export interface AvailabilitySlot {
  dateISO: string; // "YYYY-MM-DD"
  startMinutes: number;
  scheduledFor: Date;
  capacity: number;
  bookedCount: number;
  isAvailable: boolean;
}

interface SlotConfig {
  dayOfWeek: number;
  startMinutes: number;
  capacity: number;
  isActive: boolean;
}

interface ExistingBooking {
  scheduledFor: Date;
  status: string;
}

/**
 * Calcule la liste des créneaux disponibles sur les `days` prochains
 * jours (à partir de demain par défaut, pour laisser un délai au refuge).
 *
 * Compte les bookings non annulés sur chaque cellule pour décider de la
 * disponibilité.
 */
export function computeAvailability(params: {
  slots: SlotConfig[];
  bookings: ExistingBooking[];
  days?: number;
  startDate?: Date;
}): AvailabilitySlot[] {
  const { slots, bookings } = params;
  const days = params.days ?? 14;
  const start = new Date(params.startDate ?? new Date());
  start.setDate(start.getDate() + 1);
  start.setHours(0, 0, 0, 0);

  const slotsByDay = new Map<number, SlotConfig[]>();
  for (const slot of slots) {
    if (!slot.isActive) continue;
    const list = slotsByDay.get(slot.dayOfWeek) ?? [];
    list.push(slot);
    slotsByDay.set(slot.dayOfWeek, list);
  }

  // Comptage des bookings par (dateISO + minutes).
  const bookingCounts = new Map<string, number>();
  for (const b of bookings) {
    if (b.status === "annule_par_refuge" || b.status === "annule_par_user")
      continue;
    const d = new Date(b.scheduledFor);
    const key = `${d.toISOString().slice(0, 10)}_${d.getHours() * 60 + d.getMinutes()}`;
    bookingCounts.set(key, (bookingCounts.get(key) ?? 0) + 1);
  }

  const out: AvailabilitySlot[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const dow = getIsoDayOfWeek(d);
    const daySlots = slotsByDay.get(dow);
    if (!daySlots) continue;

    const dateISO = d.toISOString().slice(0, 10);
    for (const slot of daySlots) {
      const scheduled = new Date(d);
      scheduled.setHours(
        Math.floor(slot.startMinutes / 60),
        slot.startMinutes % 60,
        0,
        0
      );
      const key = `${dateISO}_${slot.startMinutes}`;
      const bookedCount = bookingCounts.get(key) ?? 0;
      out.push({
        dateISO,
        startMinutes: slot.startMinutes,
        scheduledFor: scheduled,
        capacity: slot.capacity,
        bookedCount,
        isAvailable: bookedCount < slot.capacity,
      });
    }
  }
  return out;
}

/**
 * Groupe une liste d'AvailabilitySlot par jour pour affichage UI.
 */
export function groupByDay(
  list: AvailabilitySlot[]
): Array<{ dateISO: string; date: Date; slots: AvailabilitySlot[] }> {
  const map = new Map<string, AvailabilitySlot[]>();
  for (const slot of list) {
    const arr = map.get(slot.dateISO) ?? [];
    arr.push(slot);
    map.set(slot.dateISO, arr);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateISO, slots]) => ({
      dateISO,
      date: new Date(`${dateISO}T00:00:00`),
      slots: slots.sort((a, b) => a.startMinutes - b.startMinutes),
    }));
}
