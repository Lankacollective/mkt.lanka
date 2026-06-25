import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const VAPID_SUBJECT  = "mailto:hola@lankacollective.com";
const VAPID_PUBLIC   = Deno.env.get("VAPID_PUBLIC_KEY")  || "";
const VAPID_PRIVATE  = Deno.env.get("VAPID_PRIVATE_KEY") || "";
const SUPABASE_URL   = Deno.env.get("SUPABASE_URL")   || "https://ulbqvgvzvkxztfaaekmr.supabase.co";
const SUPABASE_KEY   = Deno.env.get("SB_SERVICE_ROLE_KEY") || "";

// --- minimal VAPID / Web-Push implementation (no npm) ---

function b64urlDecode(s: string): Uint8Array {
    const pad = s.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "=");
    const bin = atob(pad);
    return Uint8Array.from(bin, c => c.charCodeAt(0));
}

function b64urlEncode(u: Uint8Array): string {
    return btoa(String.fromCharCode(...u)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

async function makeVapidJwt(audience: string): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const header = { typ: "JWT", alg: "ES256" };
    const payload = { aud: audience, exp: now + 3600, sub: VAPID_SUBJECT };
    const enc = (o: object) => b64urlEncode(new TextEncoder().encode(JSON.stringify(o)));
    const sigInput = `${enc(header)}.${enc(payload)}`;
    const privKey = await crypto.subtle.importKey(
        "jwk",
        { kty: "EC", crv: "P-256", d: VAPID_PRIVATE, x: "", y: "", key_ops: ["sign"] } as JsonWebKey,
        { name: "ECDSA", namedCurve: "P-256" },
        false, ["sign"]
    );
    const sig = await crypto.subtle.sign(
        { name: "ECDSA", hash: "SHA-256" },
        privKey,
        new TextEncoder().encode(sigInput)
    );
    return `${sigInput}.${b64urlEncode(new Uint8Array(sig))}`;
}

async function sendWebPush(sub: { endpoint: string; p256dh: string; auth: string }, payload: string) {
    const url  = new URL(sub.endpoint);
    const aud  = `${url.protocol}//${url.host}`;
    const jwt  = await makeVapidJwt(aud);
    const auth = `vapid t=${jwt},k=${VAPID_PUBLIC}`;

    // Encrypt payload (aesgcm / RFC8291)
    const salt        = crypto.getRandomValues(new Uint8Array(16));
    const serverKeys  = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveKey", "deriveBits"]);
    const serverPubRaw = new Uint8Array(await crypto.subtle.exportKey("raw", serverKeys.publicKey));

    const clientPubKey = await crypto.subtle.importKey("raw", b64urlDecode(sub.p256dh), { name: "ECDH", namedCurve: "P-256" }, false, []);
    const sharedBits   = await crypto.subtle.deriveBits({ name: "ECDH", public: clientPubKey }, serverKeys.privateKey, 256);
    const authKey      = b64urlDecode(sub.auth);

    const prk = await crypto.subtle.importKey("raw", sharedBits, { name: "HKDF" }, false, ["deriveKey", "deriveBits"]);
    const authInfoBuf  = new TextEncoder().encode("Content-Encoding: auth\0");
    const prk2Bits     = await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt: authKey, info: authInfoBuf }, prk, 256);

    const contentEncKey = new Uint8Array([
        ...new TextEncoder().encode("Content-Encoding: aesgcm\0"),
        0x00, ...serverPubRaw, ...b64urlDecode(sub.p256dh)
    ]);
    const nonceInfo = new Uint8Array([
        ...new TextEncoder().encode("Content-Encoding: nonce\0"),
        0x00, ...serverPubRaw, ...b64urlDecode(sub.p256dh)
    ]);

    const prk2Key  = await crypto.subtle.importKey("raw", prk2Bits, { name: "HKDF" }, false, ["deriveKey", "deriveBits"]);
    const ikm      = await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info: contentEncKey }, prk2Key, 128);
    const nonceRaw = await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info: nonceInfo }, prk2Key, 96);

    const encKey = await crypto.subtle.importKey("raw", ikm, { name: "AES-GCM" }, false, ["encrypt"]);
    const nonce  = new Uint8Array(nonceRaw);
    const padded = new Uint8Array([0, 0, ...new TextEncoder().encode(payload)]);
    const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, encKey, padded);

    const body = new Uint8Array(cipher);
    const res = await fetch(sub.endpoint, {
        method: "POST",
        headers: {
            "Authorization":     auth,
            "Content-Type":      "application/octet-stream",
            "Content-Encoding":  "aesgcm",
            "Encryption":        `salt=${b64urlEncode(salt)}`,
            "Crypto-Key":        `dh=${b64urlEncode(serverPubRaw)};vapid="${VAPID_PUBLIC}"`,
            "TTL":               "86400",
        },
        body,
    });
    return res;
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey" } });
    }
    try {
        const { user_id, proyecto, title, body, url, notifId } = await req.json();
        if (!user_id) return new Response(JSON.stringify({ error: "user_id required" }), { status: 400 });

        const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
        const query = sb.from("push_subscriptions").select("*").eq("user_id", user_id);
        if (proyecto) query.eq("proyecto", proyecto);
        const { data: subs, error } = await query;
        if (error) throw error;
        if (!subs?.length) return new Response(JSON.stringify({ sent: 0, reason: "no subscriptions" }), { status: 200 });

        const payload = JSON.stringify({ title: title || "mkt.lanka", body: body || "", url: url || "/", notifId: notifId || "" });
        const results = await Promise.allSettled(subs.map(s => sendWebPush(s, payload)));
        const sent    = results.filter(r => r.status === "fulfilled").length;

        return new Response(JSON.stringify({ sent, total: subs.length }), {
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
    }
});
