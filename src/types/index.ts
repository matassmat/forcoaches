export type UserRole = 'coach' | 'athlete';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: UserRole;
  phone?: string | null;
  avatarUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Treneris, vieša anketa + numatytieji nustatymai. */
export interface CoachProfile {
  id: string;
  userId: string;
  clubName?: string | null;
  bio?: string | null;
  /** Numatytoji vienos treniruotės kaina, EUR. */
  defaultSessionPrice: number;
  /** Numatytoji treniruotės trukmė, min. */
  defaultSessionMinutes: number;
  /** Kiek valandų prieš treniruotę dar leidžiama atšaukti. */
  cancellationHoursBefore: number;
  createdAt: string;
  updatedAt: string;
}

/** Sportininkas, priskirtas vienam treneriui. */
export interface AthleteProfile {
  id: string;
  userId?: string | null;
  coachId: string;
  /** Kodas, kuriuo sportininkas prisiriša prie trenerio registruodamasis. */
  inviteCode: string;
  inviteUsed: boolean;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  birthDate?: string | null;
  goal?: string | null;
  /** Individuali kaina. NULL, imama trenerio numatytoji. */
  sessionPrice?: number | null;
  /** Įprasta treniruočių vieta. */
  location?: string | null;
  status: 'invited' | 'active' | 'inactive';
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Rezervacijos ──────────────────────────────────────────────────────

/** Savaitinis trenerio darbo laikas, iš kurio generuojami laisvi langai. */
export interface AvailabilitySlot {
  id: string;
  coachId: string;
  /** 0 = sekmadienis … 6 = šeštadienis. */
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';

export interface Booking {
  id: string;
  coachId: string;
  athleteId: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  location?: string | null;
  price?: number | null;
  notes?: string | null;
  cancelledBy?: UserRole | null;
  cancelledAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Progresas ─────────────────────────────────────────────────────────

/** Vienas svėrimas / matavimas. Visi laukai išskyrus datą – neprivalomi. */
export interface Measurement {
  id: string;
  athleteId: string;
  measuredOn: string;
  weightKg?: number | null;
  bodyFatPct?: number | null;
  chestCm?: number | null;
  waistCm?: number | null;
  hipsCm?: number | null;
  thighCm?: number | null;
  armCm?: number | null;
  notes?: string | null;
  createdAt: string;
}

// ── Treniruočių programos ─────────────────────────────────────────────

export interface Program {
  id: string;
  coachId: string;
  athleteId?: string | null;
  title: string;
  description?: string | null;
  /** true – šablonas, dar nepriskirtas konkrečiam sportininkui. */
  isTemplate: boolean;
  startsOn?: string | null;
  endsOn?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Programos diena, pvz. „A diena, krūtinė / tricepsas“. */
export interface ProgramDay {
  id: string;
  programId: string;
  title: string;
  dayOrder: number;
}

export interface ProgramExercise {
  id: string;
  programDayId: string;
  name: string;
  sets: number;
  /** Kartojimai tekstu, nes pasitaiko „8-12“ ar „iki nesėkmės“. */
  reps: string;
  weightKg?: number | null;
  restSeconds?: number | null;
  notes?: string | null;
  exerciseOrder: number;
}

// ── Mityba ────────────────────────────────────────────────────────────

export interface MealPlan {
  id: string;
  coachId: string;
  athleteId?: string | null;
  title: string;
  /** Dienos kalorijų norma. */
  targetKcal?: number | null;
  targetProteinG?: number | null;
  targetCarbsG?: number | null;
  targetFatG?: number | null;
  notes?: string | null;
  isTemplate: boolean;
  createdAt: string;
  updatedAt: string;
}

export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface Meal {
  id: string;
  mealPlanId: string;
  slot: MealSlot;
  title: string;
  kcal?: number | null;
  proteinG?: number | null;
  carbsG?: number | null;
  fatG?: number | null;
  recipe?: string | null;
  /** Patiekalo nuotrauka. */
  imageUrl?: string | null;
  /** Ingredientai su kiekiais, po vieną eiluteje. */
  ingredients?: string | null;
  /** TheMealDB idMeal, jei paimta is receptu bibliotekos. */
  sourceId?: string | null;
  mealOrder: number;
}

/** Sportininko realiai suvalgytas maistas, kalorijų žymėjimasis. */
export interface FoodLogEntry {
  id: string;
  athleteId: string;
  loggedOn: string;
  slot: MealSlot;
  title: string;
  kcal: number;
  proteinG?: number | null;
  carbsG?: number | null;
  fatG?: number | null;
  /** Suvalgytas kiekis gramais, jei zinomas. */
  grams?: number | null;
  createdAt: string;
}
