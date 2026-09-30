// Tests always run against a dedicated database, never the dev one.
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/ghostpm_test?schema=public";
process.env.AUTH_SECRET ??= "test-secret";
process.env.LEMONSQUEEZY_WEBHOOK_SECRET = "whsec_test";
process.env.FREE_TASKS_PER_MONTH = "20";
