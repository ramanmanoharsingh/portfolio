import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "";
const SUPABASE_SECRET_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SECRET_KEY") ?? "";

const allowedExact = new Set([
  "https://ramans.pages.dev",
  "http://localhost:8788",
  "http://127.0.0.1:8788",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
]);

function originAllowed(origin: string | null): boolean {
  if (!origin) return true;
  if (allowedExact.has(origin)) return true;
  try {
    const host = new URL(origin).hostname;
    return host.endsWith(".ramans.pages.dev");
  } catch {
    return false;
  }
}

function corsHeaders(origin: string | null): HeadersInit {
  const headers: Record<string, string> = {
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Max-Age": "86400",
    "Content-Type": "application/json; charset=utf-8",
  };
  if (origin && originAllowed(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

function response(origin: string | null, status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders(origin) });
}

function cleanText(value: unknown, max: number): string {
  return String(value ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, max);
}

function validEmail(value: string): boolean {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (!originAllowed(origin)) return response(null, 403, { ok: false, error: "This origin is not allowed." });
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(origin) });
  if (req.method !== "POST") return response(origin, 405, { ok: false, error: "Use POST for submissions." });
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SECRET_KEY) {
    return response(origin, 503, { ok: false, error: "The secure intake service is not configured yet." });
  }

  let input: Record<string, unknown>;
  try {
    input = await req.json();
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("invalid");
  } catch {
    return response(origin, 400, { ok: false, error: "Please send a valid form submission." });
  }

  // Honeypot submissions are acknowledged without storing anything.
  if (cleanText(input.website, 300)) return response(origin, 200, { ok: true });

  const kind = cleanText(input.kind, 20).toLowerCase();
  if (!["enquiry", "question", "feedback"].includes(kind)) {
    return response(origin, 400, { ok: false, error: "Choose a valid submission type." });
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  let user: { id: string; email?: string } | null = null;
  // Supabase user access tokens are JWTs. The publishable key itself is not a user identity.
  if (token.startsWith("eyJ")) {
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data.user) return response(origin, 401, { ok: false, error: "Your session expired. Sign in again and retry." });
    user = { id: data.user.id, email: data.user.email ?? undefined };
  }

  const ip = req.headers.get("cf-connecting-ip")
    ?? req.headers.get("x-real-ip")
    ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? "unknown";
  const ipHash = await sha256(ip + "|" + SUPABASE_SECRET_KEY);
  const limits: Record<string, number> = { enquiry: 5, question: 5, feedback: 3 };
  const { data: allowed, error: rateError } = await admin.rpc("consume_intake_rate_limit", {
    p_ip_hash: ipHash,
    p_kind: kind,
    p_limit: limits[kind],
    p_window_seconds: 600,
  });
  if (rateError) return response(origin, 503, { ok: false, error: "The secure intake service is temporarily unavailable. Please try again later." });
  if (allowed !== true) return response(origin, 429, { ok: false, error: "Too many submissions in a short period. Please wait ten minutes and try again." });

  if (kind === "enquiry") {
    const name = cleanText(input.name, 120);
    const email = cleanText(input.email, 254).toLowerCase();
    const whatsapp = cleanText(input.whatsapp, 60);
    const projectType = cleanText(input.project_type, 180);
    const budgetRange = cleanText(input.budget_range, 100);
    const deadline = cleanText(input.deadline, 10);
    const preferredPayment = cleanText(input.preferred_payment, 120);
    const description = cleanText(input.description, 10000);
    if (name.length < 2 || !validEmail(email) || description.length < 15) {
      return response(origin, 400, { ok: false, error: "Enter your name, a valid email, and at least 15 characters describing the project." });
    }
    if (deadline && !/^\d{4}-\d{2}-\d{2}$/.test(deadline)) {
      return response(origin, 400, { ok: false, error: "Choose a valid deadline date." });
    }
    const { error } = await admin.from("leads").insert({
      name, email, whatsapp: whatsapp || null, project_type: projectType || null,
      budget_range: budgetRange || null, deadline: deadline || null,
      preferred_payment: preferredPayment || null, description, status: "New",
      user_id: user?.id ?? null, client_email: user?.email ?? email,
      submitter_type: user ? "client" : "anonymous",
    });
    if (error) return response(origin, 500, { ok: false, error: "Your enquiry could not be saved. Please try again shortly." });
    return response(origin, 200, { ok: true, message: "Enquiry received." });
  }

  if (kind === "question") {
    const question = cleanText(input.question, 3000);
    const email = cleanText(input.email, 254).toLowerCase();
    if (question.length < 5) return response(origin, 400, { ok: false, error: "Write a question of at least five characters." });
    if (email && !validEmail(email)) return response(origin, 400, { ok: false, error: "Enter a valid email address, or leave it blank." });
    const { error } = await admin.from("questions").insert({ question, email: email || null, user_id: user?.id ?? null });
    if (error) return response(origin, 500, { ok: false, error: "Your question could not be saved. Please try again shortly." });
    return response(origin, 200, { ok: true, message: "Question received." });
  }

  const rating = Number(input.rating);
  const text = cleanText(input.text, 4000);
  const service = cleanText(input.service, 180);
  const displayName = cleanText(input.display_name, 120);
  const projectId = cleanText(input.project_id, 36);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5 || text.length < 1) {
    return response(origin, 400, { ok: false, error: "Choose a rating from 1 to 5 and add your feedback." });
  }
  let safeProjectId: string | null = null;
  if (projectId) {
    if (!user || !isUuid(projectId)) return response(origin, 400, { ok: false, error: "Choose a valid project reference." });
    const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).maybeSingle();
    const query = admin.from("projects").select("id").eq("id", projectId);
    if (profile?.role !== "admin") query.eq("client_id", user.id);
    const { data: project, error } = await query.maybeSingle();
    if (error || !project) return response(origin, 403, { ok: false, error: "You cannot attach feedback to that project." });
    safeProjectId = project.id;
  }
  const { error } = await admin.from("feedback").insert({
    rating, text, service: service || null, display_name: displayName || null,
    project_id: safeProjectId, user_id: user?.id ?? null,
  });
  if (error) return response(origin, 500, { ok: false, error: "Your feedback could not be saved. Please try again shortly." });
  return response(origin, 200, { ok: true, message: "Feedback received." });
});
