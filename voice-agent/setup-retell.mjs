// Creates (or updates) the Qoraflow website voice agent in Retell from prompt.md.
//
//   export RETELL_API_KEY=key_...          # never commit this
//   node voice-agent/setup-retell.mjs                 # create or update
//   node voice-agent/setup-retell.mjs --voices        # list voice ids to choose from
//
// Optional env: RETELL_MODEL, RETELL_VOICE_ID.
// IDs are saved to voice-agent/retell-ids.json (not secret) so re-runs update
// the same agent instead of creating new ones.

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const API = "https://api.retellai.com";
const KEY = process.env.RETELL_API_KEY;
if (!KEY) {
  console.error("Set RETELL_API_KEY first (export RETELL_API_KEY=...).");
  process.exit(1);
}

async function api(method, path, body) {
  const res = await fetch(API + path, {
    method,
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${text.slice(0, 800)}`);
  return text ? JSON.parse(text) : {};
}

if (process.argv.includes("--voices")) {
  const voices = await api("GET", "/list-voices");
  for (const v of voices) {
    console.log([v.voice_id, v.provider, v.gender, v.accent, v.voice_name].join("  |  "));
  }
  process.exit(0);
}

const idsPath = join(here, "retell-ids.json");
const ids = JSON.parse(await readFile(idsPath, "utf8").catch(() => "{}"));
const prompt = await readFile(join(here, "prompt.md"), "utf8");

const llmBody = {
  model: process.env.RETELL_MODEL || "claude-5.5-haiku",
  general_prompt: prompt,
  // The first sentence is chosen by the Worker (worker/web-call.js) per call:
  // the short intro on the first call, "Hi again" on a restart.
  begin_message: "{{opening_line}}",
  start_speaker: "agent",
  default_dynamic_variables: {
    scenario: "The visitor wants to learn about Qoraflow.",
    language: "English",
    visitor_name: "there",
    returning: "no",
    previous_conversation: "(not available)",
    opening_line: "Hi, I'm Qora from Qoraflow. What can I help you with?",
  },
};

const llm = ids.llm_id
  ? await api("PATCH", `/update-retell-llm/${ids.llm_id}`, llmBody)
  : await api("POST", "/create-retell-llm", llmBody);
ids.llm_id = llm.llm_id;
console.log("LLM:", ids.llm_id, llmBody.model);

const agentBody = {
  agent_name: "Qoraflow website - Qora",
  response_engine: { type: "retell-llm", llm_id: ids.llm_id },
  voice_id: process.env.RETELL_VOICE_ID || ids.voice_id,
  language: "multi",
  enable_backchannel: true,
  backchannel_frequency: 0.6,
  responsiveness: 1,
  interruption_sensitivity: 0.9,
  normalize_for_speech: true,
  max_call_duration_ms: 4 * 60 * 1000,
  end_call_after_silence_ms: 20 * 1000,
  begin_message_delay_ms: 300,
  // How the voice says our brand names (IPA).
  pronunciation_dictionary: [
    { word: "Qoraflow", alphabet: "ipa", phoneme: "ˈkɔːrəfloʊ" },
    { word: "Qora", alphabet: "ipa", phoneme: "ˈkɔːrə" },
    { word: "Anudeep", alphabet: "ipa", phoneme: "ʌnuːˈdiːp" },
    { word: "Cherukupalli", alphabet: "ipa", phoneme: "tʃeɪruːkuːˈpɑːli" },
  ],
};
if (!agentBody.voice_id) {
  console.error("Pick a voice: run with --voices, then set RETELL_VOICE_ID.");
  process.exit(1);
}
ids.voice_id = agentBody.voice_id;

const agent = ids.agent_id
  ? await api("PATCH", `/update-agent/${ids.agent_id}`, agentBody)
  : await api("POST", "/create-agent", agentBody);
ids.agent_id = agent.agent_id;

await writeFile(idsPath, JSON.stringify(ids, null, 2) + "\n");
console.log("Agent:", ids.agent_id, "voice:", ids.voice_id);
console.log("\nSet this in Cloudflare Pages → Settings → Variables and Secrets:");
console.log("  RETELL_AGENT_ID =", ids.agent_id);
