const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
if (supabaseUrl && !supabaseUrl.includes("localhost") && !supabaseUrl.includes("staging")) {
  throw new Error(
    "E2E safety guard: these tests must not run against production. " +
      "NEXT_PUBLIC_SUPABASE_URL must contain 'localhost' or 'staging'.",
  );
}

import { test, expect } from "@playwright/test";

const FAKE_UUID = "00000000-0000-0000-0000-000000000000";

function looksLikeStorageUrl(body: string): boolean {
  return /signedUrl|signed_url|supabase\.co\/storage|token=|X-Amz-Signature/i.test(body);
}

test.describe("Document security smoke — unauthenticated denial only", () => {
  test("GET /api/documents/[id]/download without auth returns 401 and no document data", async ({
    request,
  }) => {
    const res = await request.get(`/api/documents/${FAKE_UUID}/download`, {
      maxRedirects: 0,
    });

    const status = res.status();
    const finalUrl = res.url();
    const bodyText = await res.text();

    const deniedByStatus = status === 401 || status === 403;
    const deniedByRedirect = status >= 300 && status < 400 && /\/login/.test(finalUrl);

    expect(
      deniedByStatus || deniedByRedirect,
      `Expected 401/403 or redirect to /login, got status=${status} url=${finalUrl}`,
    ).toBe(true);

    expect(
      looksLikeStorageUrl(bodyText),
      `Unauthenticated response must not contain a signed storage URL. Body: ${bodyText.slice(0, 500)}`,
    ).toBe(false);
  });

  test("POST /api/documents/access-url without auth returns 401 and no URL", async ({
    request,
  }) => {
    const res = await request.post("/api/documents/access-url", {
      data: { document_id: FAKE_UUID, access_type: "view" },
      maxRedirects: 0,
    });

    const status = res.status();
    const bodyText = await res.text();

    expect(status, `Expected 401/403, got ${status}. Body: ${bodyText.slice(0, 300)}`).toBeLessThan(
      500,
    );
    expect([401, 403]).toContain(status);

    expect(
      looksLikeStorageUrl(bodyText),
      `Unauthenticated response must not contain a URL. Body: ${bodyText.slice(0, 500)}`,
    ).toBe(false);
  });

  test("GET /api/documents/[id]/download with malformed Authorization header returns 401, never 500", async ({
    request,
  }) => {
    const res = await request.get(`/api/documents/${FAKE_UUID}/download`, {
      headers: {
        Authorization: "Bearer this-is-not-a-real-jwt",
      },
      maxRedirects: 0,
    });

    const status = res.status();
    const bodyText = await res.text();

    expect(
      status,
      `Malformed auth must never 500. Got ${status}. Body: ${bodyText.slice(0, 300)}`,
    ).not.toBe(500);

    expect([400, 401, 403]).toContain(status);

    expect(looksLikeStorageUrl(bodyText)).toBe(false);
  });
});
