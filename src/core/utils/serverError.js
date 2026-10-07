/**
 * Send a 500 — or a clear 503 when the real problem is that the database
 * cannot be reached (wrong DATABASE_URL, no internet, port 5432 blocked,
 * Neon project suspended). Without this the frontend only sees "Login failed".
 */
const DB_UNREACHABLE_CODES = new Set(["P1000", "P1001", "P1002", "P1008", "P1017", "P2024"]);

export const isDatabaseUnreachable = (error) =>
  error?.name === "PrismaClientInitializationError" || DB_UNREACHABLE_CODES.has(error?.code);

export const sendServerError = (res, error, fallbackMessage = "Something went wrong") => {
  if (isDatabaseUnreachable(error)) {
    return res.status(503).json({
      success: false,
      message: "The server cannot connect to the database. Check DATABASE_URL in .env, your internet connection, and that port 5432 is not blocked.",
    });
  }
  return res.status(500).json({ success: false, message: fallbackMessage });
};
