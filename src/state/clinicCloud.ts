import { getSupabase, isClinicCloudEnabled } from "./supabaseClient";
import { normalizeClinicCode } from "./clinicCode";
import { sanitisePrescription, type StoredPrescription } from "./prescriptionStore";
import { sanitiseSessionRecord, type SessionRecord } from "./patientProfile";

export type ClinicSession = SessionRecord & {
  patientName: string;
};

export type ClinicMessageSender = "patient" | "therapist";

export type ClinicMessage = {
  id: string;
  clinicCode: string;
  patientName: string;
  sender: ClinicMessageSender;
  body: string;
  sentAt: string;
};

export type ClinicConversation = {
  patientName: string;
  lastMessage: ClinicMessage | null;
  sessionCount: number;
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

type ClinicMessageRow = {
  id: string;
  clinic_code: string;
  patient_name: string;
  sender: string;
  body: string;
  sent_at: string;
};

const MESSAGE_MAX_LENGTH = 1000;
const CHAT_SESSION_KIND = "chat_message";
const CHAT_CLEARED_KIND = "chat_cleared";

/** Null until the first messages query; false means use clinic_sessions as the inbox. */
let preferDedicatedMessages: boolean | null = null;

export { normalizeClinicCode };

function isMissingTableError(error: { code?: string; message: string }): boolean {
  return error.code === "PGRST205" || /schema cache|could not find the table/i.test(error.message);
}

function clinicErrorMessage(error: { code?: string; message: string }): string {
  if (isMissingTableError(error)) {
    return "Clinic tables are missing. In the Supabase SQL editor, run supabase/clinic_sync.sql, then try again.";
  }

  if (/foreign key|clinic_plans/i.test(error.message)) {
    return "Publish the plan with this access code before messaging.";
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

export function parseClinicMessageRow(row: ClinicMessageRow | null | undefined): ClinicMessage | null {
  if (!row) {
    return null;
  }

  const sender = row.sender === "therapist" ? "therapist" : row.sender === "patient" ? "patient" : null;
  const body = row.body.trim();
  const patientName = row.patient_name.trim();

  if (!sender || !body || !patientName) {
    return null;
  }

  return {
    id: row.id,
    clinicCode: row.clinic_code,
    patientName,
    sender,
    body: body.slice(0, MESSAGE_MAX_LENGTH),
    sentAt: row.sent_at,
  };
}

export function parseChatClearedAt(row: ClinicSessionRow | null | undefined): { patientName: string; clearedAt: string } | null {
  if (!row || !row.payload || typeof row.payload !== "object") {
    return null;
  }

  const payload = row.payload as { kind?: unknown; at?: unknown };
  const patientName = row.patient_name.trim();

  if (payload.kind !== CHAT_CLEARED_KIND || !patientName) {
    return null;
  }

  const clearedAt = typeof payload.at === "string" && payload.at ? payload.at : row.recorded_at;
  return { patientName, clearedAt };
}

export function applyChatHistoryClears(
  messages: ClinicMessage[],
  clears: Array<{ patientName: string; clearedAt: string }>,
): ClinicMessage[] {
  if (clears.length === 0) {
    return messages;
  }

  const latest = new Map<string, number>();

  for (const clear of clears) {
    const key = conversationKey(clear.patientName);
    const at = Date.parse(clear.clearedAt);

    if (!key || Number.isNaN(at)) {
      continue;
    }

    const current = latest.get(key);
    if (current === undefined || at > current) {
      latest.set(key, at);
    }
  }

  return messages.filter((message) => {
    const cutoff = latest.get(conversationKey(message.patientName));
    return cutoff === undefined || Date.parse(message.sentAt) > cutoff;
  });
}

export function parseChatSessionRow(row: ClinicSessionRow | null | undefined): ClinicMessage | null {
  if (!row || !row.payload || typeof row.payload !== "object") {
    return null;
  }

  const payload = row.payload as { kind?: unknown; sender?: unknown; body?: unknown };

  if (payload.kind !== CHAT_SESSION_KIND) {
    return null;
  }

  return parseClinicMessageRow({
    id: row.id,
    clinic_code: row.clinic_code,
    patient_name: row.patient_name,
    sender: typeof payload.sender === "string" ? payload.sender : "",
    body: typeof payload.body === "string" ? payload.body : "",
    sent_at: row.recorded_at,
  });
}

function samePatient(left: string, right: string): boolean {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

function conversationKey(name: string): string {
  return name.trim().toLowerCase();
}

export function mergeClinicInbox(
  sessions: ClinicSession[],
  messages: ClinicMessage[],
  extraNames: string[] = [],
): ClinicConversation[] {
  const map = new Map<string, ClinicConversation>();

  function upsert(name: string): ClinicConversation | undefined {
    const trimmed = name.trim();
    const key = conversationKey(trimmed);

    if (!key) {
      return undefined;
    }

    const existing = map.get(key);

    if (existing) {
      return existing;
    }

    const created: ClinicConversation = {
      patientName: trimmed.slice(0, 80),
      lastMessage: null,
      sessionCount: 0,
    };
    map.set(key, created);
    return created;
  }

  for (const name of extraNames) {
    upsert(name);
  }

  for (const session of sessions) {
    const row = upsert(session.patientName);
    if (row) {
      row.sessionCount += 1;
    }
  }

  for (const message of messages) {
    const row = upsert(message.patientName);
    if (!row) {
      continue;
    }

    if (!row.lastMessage || Date.parse(message.sentAt) >= Date.parse(row.lastMessage.sentAt)) {
      row.lastMessage = message;
    }
  }

  return [...map.values()].sort((a, b) => {
    const aTime = a.lastMessage?.sentAt ?? "";
    const bTime = b.lastMessage?.sentAt ?? "";

    if (aTime !== bTime) {
      return bTime.localeCompare(aTime);
    }

    return a.patientName.localeCompare(b.patientName);
  });
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

async function fetchDedicatedMessages(
  clinicCode: string,
  patientName?: string,
): Promise<ClinicMessage[]> {
  const supabase = getSupabase();

  if (!supabase) {
    return [];
  }

  let query = supabase
    .from("clinic_messages")
    .select("id, clinic_code, patient_name, sender, body, sent_at")
    .eq("clinic_code", clinicCode)
    .order("sent_at", { ascending: true })
    .limit(patientName ? 200 : 400);

  const threadName = patientName?.trim();
  if (threadName) {
    query = query.eq("patient_name", threadName.slice(0, 80));
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data as ClinicMessageRow[] | null)?.flatMap((row) => {
    const message = parseClinicMessageRow(row);
    return message ? [message] : [];
  }) ?? [];
}

async function fetchSessionMessages(clinicCode: string, patientName?: string): Promise<ClinicMessage[]> {
  const supabase = getSupabase();

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("clinic_sessions")
    .select("id, clinic_code, patient_name, recorded_at, payload")
    .eq("clinic_code", clinicCode)
    .order("recorded_at", { ascending: true })
    .limit(400);

  if (error) {
    throw new Error(clinicErrorMessage(error));
  }

  const threadName = patientName?.trim();
  const rows = (data as ClinicSessionRow[] | null) ?? [];
  const clears: Array<{ patientName: string; clearedAt: string }> = [];
  const messages: ClinicMessage[] = [];

  for (const row of rows) {
    const cleared = parseChatClearedAt(row);
    if (cleared && (!threadName || samePatient(cleared.patientName, threadName))) {
      clears.push(cleared);
    }

    const message = parseChatSessionRow(row);

    if (!message) {
      continue;
    }

    if (threadName && !samePatient(message.patientName, threadName)) {
      continue;
    }

    messages.push(message);
  }

  return applyChatHistoryClears(messages, clears);
}

export async function fetchClinicMessages(code: string, patientName?: string): Promise<ClinicMessage[]> {
  const supabase = getSupabase();
  const clinicCode = normalizeClinicCode(code);

  if (!supabase || !clinicCode) {
    return [];
  }

  if (preferDedicatedMessages !== false) {
    try {
      const messages = await fetchDedicatedMessages(clinicCode, patientName);
      preferDedicatedMessages = true;
      return messages;
    } catch (error) {
      if (!error || typeof error !== "object" || !isMissingTableError(error as { code?: string; message: string })) {
        throw error instanceof Error ? error : new Error("Could not load messages.");
      }

      preferDedicatedMessages = false;
    }
  }

  return fetchSessionMessages(clinicCode, patientName);
}

export async function sendClinicMessage(
  code: string,
  patientName: string,
  sender: ClinicMessageSender,
  body: string,
): Promise<ClinicMessage> {
  const supabase = getSupabase();
  const clinicCode = normalizeClinicCode(code);
  const name = patientName.trim().slice(0, 80);
  const text = body.trim().slice(0, MESSAGE_MAX_LENGTH);

  if (!supabase) {
    throw new Error("Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env, then restart the app.");
  }

  if (!clinicCode) {
    throw new Error("Set an access code so this conversation can sync.");
  }

  if (!name) {
    throw new Error("A patient name is required to send a message.");
  }

  if (!text) {
    throw new Error("Write a message first.");
  }

  if (preferDedicatedMessages !== false) {
    const { data, error } = await supabase
      .from("clinic_messages")
      .insert({
        clinic_code: clinicCode,
        patient_name: name,
        sender,
        body: text,
      })
      .select("id, clinic_code, patient_name, sender, body, sent_at")
      .single();

    if (!error) {
      preferDedicatedMessages = true;
      const message = parseClinicMessageRow(data as ClinicMessageRow | null);

      if (!message) {
        throw new Error("Message was saved but could not be read back.");
      }

      return message;
    }

    if (!isMissingTableError(error)) {
      throw new Error(clinicErrorMessage(error));
    }

    preferDedicatedMessages = false;
  }

  const sentAt = new Date().toISOString();
  const { data, error } = await supabase
    .from("clinic_sessions")
    .insert({
      clinic_code: clinicCode,
      patient_name: name,
      recorded_at: sentAt,
      payload: {
        kind: CHAT_SESSION_KIND,
        sender,
        body: text,
      },
    })
    .select("id, clinic_code, patient_name, recorded_at, payload")
    .single();

  if (error) {
    throw new Error(clinicErrorMessage(error));
  }

  const message = parseChatSessionRow(data as ClinicSessionRow | null);

  if (!message) {
    throw new Error("Message was saved but could not be read back.");
  }

  return message;
}

export async function clearClinicChat(code: string, patientName: string): Promise<void> {
  const supabase = getSupabase();
  const clinicCode = normalizeClinicCode(code);
  const name = patientName.trim().slice(0, 80);

  if (!supabase) {
    throw new Error("Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env, then restart the app.");
  }

  if (!clinicCode) {
    throw new Error("Set an access code so this conversation can sync.");
  }

  if (!name) {
    throw new Error("A patient name is required to clear a conversation.");
  }

  const clearedAt = new Date().toISOString();
  const { error } = await supabase.from("clinic_sessions").insert({
    clinic_code: clinicCode,
    patient_name: name,
    recorded_at: clearedAt,
    payload: {
      kind: CHAT_CLEARED_KIND,
      at: clearedAt,
    },
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
    onMessage?: (message: ClinicMessage) => void;
    onChatCleared?: (patientName: string, clearedAt: string) => void;
  },
  topic = "live",
): () => void {
  const supabase = getSupabase();
  const clinicCode = normalizeClinicCode(code);

  if (!supabase || !clinicCode) {
    return () => undefined;
  }

  const channel = supabase
    .channel(`clinic:${clinicCode}:${topic}`)
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
        const row = payload.new as ClinicSessionRow;
        const session = parseClinicSessionRow(row);
        if (session) {
          handlers.onSession?.(session);
        }

        const message = parseChatSessionRow(row);
        if (message) {
          handlers.onMessage?.(message);
        }

        const cleared = parseChatClearedAt(row);
        if (cleared) {
          handlers.onChatCleared?.(cleared.patientName, cleared.clearedAt);
        }
      },
    )
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "clinic_messages",
        filter: `clinic_code=eq.${clinicCode}`,
      },
      (payload) => {
        const message = parseClinicMessageRow(payload.new as ClinicMessageRow);
        if (message) {
          handlers.onMessage?.(message);
        }
      },
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

export { isClinicCloudEnabled };
