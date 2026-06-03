// Result returned by delete Server Actions. We return a result object instead
// of throwing because Next.js redacts thrown Server Action error messages in
// production builds — returning the reason as data keeps it visible to the user.
export type DeleteResult = { ok: true } | { ok: false; error: string };
