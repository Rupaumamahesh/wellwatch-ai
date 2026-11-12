import test from "node:test";
import assert from "node:assert/strict";
import { api } from "./api.js";

test("expired stored credentials do not block login or reset requests", async () => {
  const priorStorage = globalThis.localStorage;
  const priorFetch = globalThis.fetch;
  const calls = [];
  globalThis.localStorage = { getItem: () => "expired-token" };
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return { ok: true, json: async () => ({}) };
  };
  try {
    await api.login({ email: "test@example.test", password: "test" });
    await api.forgotPassword("test@example.test");
    await api.resetPassword("uid", "token", "password");
    await api.profile();
    assert.ok(calls.slice(0, 3).every(({options}) => !options.headers.Authorization));
    assert.equal(calls[3].options.headers.Authorization, "Token expired-token");
    assert.equal(calls[0].url, "/api/login");
  } finally {
    globalThis.localStorage = priorStorage;
    globalThis.fetch = priorFetch;
  }
});
