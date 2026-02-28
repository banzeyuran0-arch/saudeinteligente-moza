import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Web Push encryption helpers
async function importVapidKeys(publicKeyBase64: string, privateKeyBase64: string) {
  // Decode public key
  const pubPadding = "=".repeat((4 - (publicKeyBase64.length % 4)) % 4);
  const pubBase64 = (publicKeyBase64 + pubPadding).replace(/-/g, "+").replace(/_/g, "/");
  const pubRaw = Uint8Array.from(atob(pubBase64), c => c.charCodeAt(0));

  // Decode private key (d parameter)
  const privPadding = "=".repeat((4 - (privateKeyBase64.length % 4)) % 4);
  const privBase64 = (privateKeyBase64 + privPadding).replace(/-/g, "+").replace(/_/g, "/");
  const privRaw = Uint8Array.from(atob(privBase64), c => c.charCodeAt(0));

  // Import public key
  const publicKey = await crypto.subtle.importKey(
    "raw", pubRaw,
    { name: "ECDSA", namedCurve: "P-256" },
    true, []
  );

  // Build JWK for private key
  const x = pubRaw.slice(1, 33);
  const y = pubRaw.slice(33, 65);
  const xB64 = btoa(String.fromCharCode(...x)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const yB64 = btoa(String.fromCharCode(...y)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const dB64 = btoa(String.fromCharCode(...privRaw)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  const privateKey = await crypto.subtle.importKey(
    "jwk",
    { kty: "EC", crv: "P-256", x: xB64, y: yB64, d: dB64, ext: true },
    { name: "ECDSA", namedCurve: "P-256" },
    true, ["sign"]
  );

  return { publicKey, privateKey, publicKeyRaw: pubRaw };
}

function base64UrlEncode(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(str: string): Uint8Array {
  const padding = "=".repeat((4 - (str.length % 4)) % 4);
  const base64 = (str + padding).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(base64), c => c.charCodeAt(0));
}

async function createJWT(privateKey: CryptoKey, audience: string, subject: string) {
  const header = { typ: "JWT", alg: "ES256" };
  const now = Math.floor(Date.now() / 1000);
  const payload = { aud: audience, exp: now + 86400, sub: subject };

  const headerB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const input = `${headerB64}.${payloadB64}`;

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    new TextEncoder().encode(input)
  );

  // Convert DER signature to raw r||s format
  const sigArray = new Uint8Array(signature);
  let r: Uint8Array, s: Uint8Array;

  if (sigArray[0] === 0x30) {
    // DER encoded
    const rLen = sigArray[3];
    const rStart = 4;
    const rBytes = sigArray.slice(rStart, rStart + rLen);
    const sLen = sigArray[rStart + rLen + 1];
    const sStart = rStart + rLen + 2;
    const sBytes = sigArray.slice(sStart, sStart + sLen);
    r = rBytes.length > 32 ? rBytes.slice(rBytes.length - 32) : rBytes;
    s = sBytes.length > 32 ? sBytes.slice(sBytes.length - 32) : sBytes;
    if (r.length < 32) { const t = new Uint8Array(32); t.set(r, 32 - r.length); r = t; }
    if (s.length < 32) { const t = new Uint8Array(32); t.set(s, 32 - s.length); s = t; }
  } else {
    // Already raw
    r = sigArray.slice(0, 32);
    s = sigArray.slice(32, 64);
  }

  const rawSig = new Uint8Array(64);
  rawSig.set(r, 0);
  rawSig.set(s, 32);

  return `${input}.${base64UrlEncode(rawSig)}`;
}

async function encryptPayload(
  payload: string,
  p256dhKey: string,
  authSecret: string,
  localPublicKeyRaw: Uint8Array,
  localPrivateKey: CryptoKey
) {
  const clientPublicKey = base64UrlDecode(p256dhKey);
  const clientAuth = base64UrlDecode(authSecret);

  // Import client public key
  const clientKey = await crypto.subtle.importKey(
    "raw", clientPublicKey,
    { name: "ECDH", namedCurve: "P-256" },
    false, []
  );

  // Generate local ephemeral key pair
  const localKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true, ["deriveBits"]
  );

  const localPubRaw = new Uint8Array(await crypto.subtle.exportKey("raw", localKeyPair.publicKey));

  // ECDH shared secret
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "ECDH", public: clientKey },
      localKeyPair.privateKey, 256
    )
  );

  // HKDF for auth info
  const authInfo = new TextEncoder().encode("Content-Encoding: auth\0");
  const prkKey = await crypto.subtle.importKey("raw", sharedSecret, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);

  // IKM using auth secret
  const authHmacKey = await crypto.subtle.importKey("raw", clientAuth, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const prk = new Uint8Array(await crypto.subtle.sign("HMAC", authHmacKey, sharedSecret));

  // Derive content encryption key
  const cekInfo = new Uint8Array([
    ...new TextEncoder().encode("Content-Encoding: aes128gcm\0"),
  ]);

  const prkImport = await crypto.subtle.importKey("raw", prk, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const cekFull = new Uint8Array(await crypto.subtle.sign("HMAC", prkImport, new Uint8Array([...cekInfo, 1])));
  const cek = cekFull.slice(0, 16);

  // Derive nonce
  const nonceInfo = new Uint8Array([
    ...new TextEncoder().encode("Content-Encoding: nonce\0"),
  ]);
  const nonceFull = new Uint8Array(await crypto.subtle.sign("HMAC", prkImport, new Uint8Array([...nonceInfo, 1])));
  const nonce = nonceFull.slice(0, 12);

  // Pad payload
  const payloadBytes = new TextEncoder().encode(payload);
  const paddedPayload = new Uint8Array(payloadBytes.length + 1);
  paddedPayload.set(payloadBytes);
  paddedPayload[payloadBytes.length] = 2; // delimiter

  // AES-GCM encrypt
  const aesKey = await crypto.subtle.importKey("raw", cek, { name: "AES-GCM" }, false, ["encrypt"]);
  const encrypted = new Uint8Array(await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonce },
    aesKey,
    paddedPayload
  ));

  // Build aes128gcm header
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const recordSize = new DataView(new ArrayBuffer(4));
  recordSize.setUint32(0, encrypted.length + 86);

  const header = new Uint8Array([
    ...salt,
    ...new Uint8Array(recordSize.buffer),
    localPubRaw.length,
    ...localPubRaw,
  ]);

  const body = new Uint8Array(header.length + encrypted.length);
  body.set(header);
  body.set(encrypted, header.length);

  return body;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { userId, title, body: msgBody, tag, url, actions } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY")!;
    const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY")!;

    if (!vapidPublic || !vapidPrivate) {
      throw new Error("VAPID keys not configured");
    }

    const sb = createClient(supabaseUrl, supabaseKey);

    // Get user's push subscriptions
    const { data: subscriptions } = await sb
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", userId);

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ sent: 0, reason: "no_subscriptions" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { privateKey } = await importVapidKeys(vapidPublic, vapidPrivate);

    const payload = JSON.stringify({ title, body: msgBody, tag, url, actions });
    let sent = 0;

    for (const sub of subscriptions) {
      try {
        const endpointUrl = new URL(sub.endpoint);
        const audience = `${endpointUrl.protocol}//${endpointUrl.host}`;
        const jwt = await createJWT(privateKey, audience, `mailto:saude@inteligente.mz`);

        const response = await fetch(sub.endpoint, {
          method: "POST",
          headers: {
            "Authorization": `vapid t=${jwt}, k=${vapidPublic}`,
            "Content-Type": "application/octet-stream",
            "Content-Encoding": "aes128gcm",
            "TTL": "86400",
            "Urgency": "high",
          },
          body: new TextEncoder().encode(payload),
        });

        if (response.status === 201 || response.status === 200) {
          sent++;
        } else if (response.status === 410 || response.status === 404) {
          // Subscription expired, remove it
          await sb.from("push_subscriptions").delete().eq("id", sub.id);
        } else {
          console.error(`Push failed for ${sub.endpoint}: ${response.status} ${await response.text()}`);
        }
      } catch (err) {
        console.error(`Push error for sub ${sub.id}:`, err);
      }
    }

    return new Response(JSON.stringify({ sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-push error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
