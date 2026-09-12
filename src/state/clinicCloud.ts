import { getSupabase, isClinicCloudEnabled } from "./supabaseClient";
import { normalizeClinicCode } from "./clinicCode";
import { sanitisePrescription, type StoredPrescription } from "./prescriptionStore";
import { sanitiseSessionRecord, type SessionRecord } from "./patientProfile";

export type ClinicSession = SessionRecord & {
  patientName: string;
};

type ClinicPlanRow = {
  clinic_code: string;
  therapist: string;
  title: string;
  plan: unknown;
  published_at: string;
};

type ClinicSessionRow = {
  id: string;
  clinic_code: string;
  patient_name: string;
  recorded_at: string;
  payload: unknown;
};

export { normalizeClinicCode };

function clinicErrorMessage(error: { code?: string; message: string }): string {
  if (error.code === "PGRST205" || /schema cache|could not find the table/i.test(error.message)) {
    return "Clinic tables are missing. In the Supabase SQL editor, run supabase/clinic_sync.sql, then try again.";
  }

  return error.message;
}

export function parseClinicPlanRow(row: ClinicPlanRow | null | undefined): StoredPrescription | null {
  if (!row) {
    return null;
  }

  const plan = sanitisePrescription(
    row.plan && typeof row.plan === "object" ? (row.plan as Parameters<typeof sanitisePrescription>[0]) : undefined,
  );

  if (!plan) {
    return null;
  }

  return {
    plan: {
      ...plan,
      accessCode: plan.accessCode ?? row.clinic_code,
    },
    publishedAt: row.published_at,
  };
}

export function parseClinicSessionRow(row: ClinicSessionRow | null | undefined): ClinicSession | null {
  if (!row) {
    return null;
  }

  const record = sanitiseSessionRecord(row.payload, row.id);

  if (!record) {
    return null;
  }

  return {
    ...record,
    date: record.date || row.recorded_at,
    patientName: row.patient_name.trim() || "Patient",
  };
}

export async function fetchClinicPlan(code: string): Promise<StoredPrescription | null> {
  const supabase = getSupabase();
  const clinicCode = normalizeClinicCode(code);

  if (!supabase || !clinicCode) {
    return null;
  }

  const { data, error } = await supabase
    .from("clinic_plans")
    .select("clinic_code, therapist, title, plan, published_at")
    .eq("clinic_code", clinicCode)
    .maybeSingle();

  if (error) {
    throw new Error(clinicErrorMessage(error));
  }

  return parseClinicPlanRow(data as ClinicPlanRow | null);
}

export async function publishClinicPlan(stored: StoredPrescription): Promise<void> {
  const supabase = getSupabase();
  const clinicCode = normalizeClinicCode(stored.plan.accessCode);

  if (!supabase) {
    throw new Error("Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env, then restart the app.");
  }

  if (!clinicCode) {
    throw new Error("Set an access code so patients on other devices can find this plan.");
  }

  const publishedAt = stored.publishedAt ?? new Date().toISOString();
  const { error } = await supabase.from("clinic_plans").upsert({
    clinic_code: clinicCode,
    therapist: stored.plan.therapist,
    title: stored.plan.title,
    plan: stored.plan,
    published_at: publishedAt,
    updated_at: publishedAt,
  });

  if (error) {
    throw new Error(clinicErrorMessage(error));
  }
}

export async function fetchClinicSessions(code: string): Promise<ClinicSession[]> {
  const supabase = getSupabase();
  const clinicCode = normalizeClinicCode(code);

  if (!supabase || !clinicCode) {
    return [];
  }

  const { data, error } = await supabase
    .from("clinic_sessions")
    .select("id, clinic_code, patient_name, recorded_at, payload")
    .eq("clinic_code", clinicCode)
    .order("recorded_at", { ascending: false })
    .limit(40);

  if (error) {
    throw new Error(clinicErrorMessage(error));
  }

  return (data as ClinicSessionRow[] | null)?.flatMap((row) => {
    const session = parseClinicSessionRow(row);
    return session ? [session] : [];
  }) ?? [];
}

export async function publishClinicSession(
  code: string,
  patientName: string,
  record: SessionRecord,
): Promise<void> {
  const supabase = getSupabase();
  const clinicCode = normalizeClinicCode(code);

  if (!supabase || !clinicCode) {
    return;
  }

  const { error } = await supabase.from("clinic_sessions").insert({
    clinic_code: clinicCode,
    patient_name: patientName.trim().slice(0, 80),
    recorded_at: record.date,
    payload: record,
  });

  if (error) {
    throw new Error(clinicErrorMessage(error));
  }
}

export function subscribeClinic(
  code: string,
  handlers: {
    onPlan?: (stored: StoredPrescription) => void;
    onSession?: (session: ClinicSession) => void;
  },
): () => void {
  const supabase = getSupabase();
  const clinicCode = normalizeClinicCode(code);

  if (!supabase || !clinicCode) {
    return () => undefined;
  }

  const channel = supabase
    .channel(`clinic:${clinicCode}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "clinic_plans",
        filter: `clinic_code=eq.${clinicCode}`,
      },
      (payload) => {
        const stored = parseClinicPlanRow(payload.new as ClinicPlanRow);
        if (stored) {
          handlers.onPlan?.(stored);
        }
      },
    )
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "clinic_sessions",
        filter: `clinic_code=eq.${clinicCode}`,
      },
      (payload) => {
        const session = parseClinicSessionRow(payload.new as ClinicSessionRow);
        if (session) {
          handlers.onSession?.(session);
        }
      },
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

export { isClinicCloudEnabled };
