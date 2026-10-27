//! Local Secret Store for Operon— encrypted at rest with AES-256-GCM.
//!
//! SSOT location: `~/.operon/system/secrets.json` (resolved from `DATA_DIR`).
//! Key material: `SECRET_KEY` env (base64 or hex, 32 bytes) or `~/.operon/system/.secret_key`
//! (64 hex chars, auto-generated on first write with `0600`).
//!
//! Workflows reference values as `{{secrets.<name>}}` — the value never lives in the
//! workflow graph, the job payload, or (optionally) the logs (see `SecretMasker`).
//!
//! NOTE: this is the *local* store (Phase 4A). The cloud-synced, device-portable
//! envelope-encryption layer (KEK/DEK + per-device key wrapping) is Phase 4B.

use std::collections::BTreeMap;
use std::path::PathBuf;

use aes_gcm::aead::{Aead, KeyInit};
use aes_gcm::{Aes256Gcm, Key, Nonce};
use base64::engine::general_purpose::STANDARD as B64;
use base64::Engine as _;
use rand::RngCore;

pub const FILE_SECRETS_JSON: &str = "secrets.json";
pub const FILE_SECRET_KEY: &str = ".secret_key";
pub const ENV_SECRET_KEY: &str = "SECRET_KEY";
pub const SSOT_DIR_NAME: &str = ".operon";

const WIRE_VERSION: u64 = 1;
const NONCE_LEN: usize = 12;
const KEY_LEN: usize = 32;

/// Resolves the Secret Store directory (`<ssot>/system`).
pub fn resolve_system_dir() -> PathBuf {
    let root = std::env::var(crate::constants::ENV_DATA_DIR)
        .ok()
        .filter(|s| !s.trim().is_empty())
        .map(PathBuf::from)
        .or_else(|| {
            std::env::var("HOME")
                .or_else(|_| std::env::var("USERPROFILE"))
                .ok()
                .map(|h| PathBuf::from(h).join(SSOT_DIR_NAME))
        })
        .unwrap_or_else(|| PathBuf::from(SSOT_DIR_NAME));
    root.join("system")
}

/// A local, encrypted-at-rest key/value store for workflow secrets.
#[derive(Debug, Clone)]
pub struct SecretStore {
    dir: PathBuf,
}

impl Default for SecretStore {
    fn default() -> Self {
        Self::new()
    }
}

impl SecretStore {
    pub fn new() -> Self {
        Self {
            dir: resolve_system_dir(),
        }
    }

    pub fn with_dir(dir: PathBuf) -> Self {
        Self { dir }
    }

    pub fn dir(&self) -> &PathBuf {
        &self.dir
    }

    fn secrets_path(&self) -> PathBuf {
        self.dir.join(FILE_SECRETS_JSON)
    }

    fn key_path(&self) -> PathBuf {
        self.dir.join(FILE_SECRET_KEY)
    }

    /// Resolves the 32-byte key: `SECRET_KEY` env, else the key file.
    fn load_key(&self) -> Result<[u8; KEY_LEN], String> {
        if let Ok(raw) = std::env::var(ENV_SECRET_KEY) {
            let raw = raw.trim().to_string();
            if !raw.is_empty() {
                return decode_key(&raw);
            }
        }
        let kp = self.key_path();
        if let Ok(content) = std::fs::read_to_string(&kp) {
            return decode_key(content.trim());
        }
        Err(format!(
            "No Secret Store key found. Set {} env or run `opn secret init`.",
            ENV_SECRET_KEY
        ))
    }

    /// Generates a fresh key file (0600) if none exists. Returns the key.
    pub fn ensure_key(&self) -> Result<[u8; KEY_LEN], String> {
        if let Ok(k) = self.load_key() {
            return Ok(k);
        }
        std::fs::create_dir_all(&self.dir).map_err(|e| e.to_string())?;
        let mut key = [0u8; KEY_LEN];
        rand::rngs::OsRng.fill_bytes(&mut key);
        let hex_key: String = key.iter().map(|b| format!("{:02x}", b)).collect();
        let kp = self.key_path();
        std::fs::write(&kp, hex_key).map_err(|e| e.to_string())?;
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let _ = std::fs::set_permissions(&kp, std::fs::Permissions::from_mode(0o600));
        }
        Ok(key)
    }

    /// Loads all secrets. Supports the encrypted wire format and a legacy plaintext
    /// map (dev only, values that are plain JSON strings).
    pub fn load_all(&self) -> Result<BTreeMap<String, String>, String> {
        let path = self.secrets_path();
        if !path.exists() {
            return Ok(BTreeMap::new());
        }
        let raw = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
        let v: serde_json::Value =
            serde_json::from_str(&raw).map_err(|e| format!("Invalid secrets.json: {}", e))?;

        let obj = v
            .as_object()
            .ok_or_else(|| "secrets.json must be a JSON object".to_string())?;

        // Encrypted envelope?
        if obj.contains_key("ciphertext") {
            let nonce_b64 = obj.get("nonce").and_then(|n| n.as_str()).unwrap_or("");
            let ct_b64 = obj.get("ciphertext").and_then(|n| n.as_str()).unwrap_or("");
            let key = self.load_key()?;
            let plaintext = decrypt(&key, nonce_b64, ct_b64)?;
            return serde_json::from_str(&plaintext)
                .map_err(|e| format!("Decrypted payload is not a JSON map: {}", e));
        }

        // Legacy plaintext map (dev) — accept `{name: value}` of strings.
        let mut out = BTreeMap::new();
        for (k, val) in obj {
            if let Some(s) = val.as_str() {
                out.insert(k.clone(), s.to_string());
            }
        }
        Ok(out)
    }

    pub fn save_all(&self, map: &BTreeMap<String, String>) -> Result<(), String> {
        std::fs::create_dir_all(&self.dir).map_err(|e| e.to_string())?;
        let key = self.ensure_key()?;
        let plaintext = serde_json::to_string(map).map_err(|e| e.to_string())?;
        let (nonce_b64, ct_b64) = encrypt(&key, &plaintext)?;
        let wire = serde_json::json!({
            "version": WIRE_VERSION,
            "alg": "AES-256-GCM",
            "nonce": nonce_b64,
            "ciphertext": ct_b64,
        });
        let path = self.secrets_path();
        std::fs::write(&path, serde_json::to_string_pretty(&wire).unwrap())
            .map_err(|e| e.to_string())?;
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let _ = std::fs::set_permissions(&path, std::fs::Permissions::from_mode(0o600));
        }
        Ok(())
    }

    pub fn set(&self, name: &str, value: &str) -> Result<(), String> {
        if name.trim().is_empty() {
            return Err("Secret name must not be empty".to_string());
        }
        let mut map = self.load_all()?;
        map.insert(name.trim().to_string(), value.to_string());
        self.save_all(&map)
    }

    pub fn remove(&self, name: &str) -> Result<bool, String> {
        let mut map = self.load_all()?;
        let existed = map.remove(name).is_some();
        if existed {
            self.save_all(&map)?;
        }
        Ok(existed)
    }

    pub fn get(&self, name: &str) -> Result<Option<String>, String> {
        Ok(self.load_all()?.get(name).cloned())
    }

    pub fn list(&self) -> Result<Vec<String>, String> {
        Ok(self.load_all()?.into_keys().collect())
    }
}

fn decode_key(raw: &str) -> Result<[u8; KEY_LEN], String> {
    // hex (64 chars)
    if raw.len() == KEY_LEN * 2 && raw.chars().all(|c| c.is_ascii_hexdigit()) {
        let mut out = [0u8; KEY_LEN];
        for i in 0..KEY_LEN {
            out[i] = u8::from_str_radix(&raw[i * 2..i * 2 + 2], 16)
                .map_err(|e| format!("bad hex key: {}", e))?;
        }
        return Ok(out);
    }
    // base64
    if let Ok(bytes) = B64.decode(raw) {
        if bytes.len() == KEY_LEN {
            let mut out = [0u8; KEY_LEN];
            out.copy_from_slice(&bytes);
            return Ok(out);
        }
    }
    // raw 32 bytes
    if raw.len() == KEY_LEN {
        let mut out = [0u8; KEY_LEN];
        out.copy_from_slice(raw.as_bytes());
        return Ok(out);
    }
    Err(format!(
        "{} must be 32 bytes (hex/base64/raw); got {} chars",
        ENV_SECRET_KEY,
        raw.len()
    ))
}

fn encrypt(key: &[u8; KEY_LEN], plaintext: &str) -> Result<(String, String), String> {
    let cipher = Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(key));
    let mut nonce_bytes = [0u8; NONCE_LEN];
    rand::rngs::OsRng.fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);
    let ct = cipher
        .encrypt(nonce, plaintext.as_bytes())
        .map_err(|e| format!("AES-GCM encrypt failed: {}", e))?;
    Ok((B64.encode(nonce_bytes), B64.encode(ct)))
}

fn decrypt(key: &[u8; KEY_LEN], nonce_b64: &str, ct_b64: &str) -> Result<String, String> {
    let cipher = Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(key));
    let nonce_bytes = B64.decode(nonce_b64).map_err(|e| e.to_string())?;
    if nonce_bytes.len() != NONCE_LEN {
        return Err("Invalid nonce length in secrets.json".to_string());
    }
    let ct = B64.decode(ct_b64).map_err(|e| e.to_string())?;
    let pt = cipher
        .decrypt(Nonce::from_slice(&nonce_bytes), ct.as_ref())
        .map_err(|_| "AES-GCM decrypt failed (wrong key or corrupted store)".to_string())?;
    String::from_utf8(pt).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_roundtrip_with_env_key() {
        let dir = std::env::temp_dir().join(format!("tq_secrets_test_{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();
        unsafe {
            std::env::set_var(
                ENV_SECRET_KEY,
                "00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff",
            );
        }
        let store = SecretStore::with_dir(dir.clone());
        store.set("hrms_password", "s3cr3t-test-value").unwrap();
        let all = store.load_all().unwrap();
        assert_eq!(
            all.get("hrms_password"),
            Some(&"s3cr3t-test-value".to_string())
        );
        // file must be an encrypted envelope (no plaintext leak)
        let raw = std::fs::read_to_string(dir.join(FILE_SECRETS_JSON)).unwrap();
        assert!(
            !raw.contains("s3cr3t-test-value"),
            "plaintext leaked into secrets.json"
        );
        assert!(raw.contains("ciphertext"));
        unsafe {
            std::env::remove_var(ENV_SECRET_KEY);
        }
        let _ = std::fs::remove_dir_all(&dir);
    }
}

// ===========================================================================
// v2 hardening — device keypair, libsodium-compatible sealed box, XChaCha20
// ===========================================================================

use blake2::{
    digest::{Update, VariableOutput},
    Blake2bVar,
};
use chacha20poly1305::{XChaCha20Poly1305, XNonce};
use crypto_box::aead::generic_array::GenericArray;
use crypto_box::aead::AeadCore as CbAeadCore;
use crypto_box::{PublicKey as CbPublicKey, SalsaBox, SecretKey as CbSecretKey};

pub const FILE_DEVICE_KEY: &str = ".device_key";
pub const FILE_DEVICE_PUB: &str = ".device_pub";

/// X25519 device keypair. The private key never leaves the device.
#[derive(Debug, Clone)]
pub struct DeviceKeypair {
    pub public: [u8; 32],
    pub secret: [u8; 32],
}

impl DeviceKeypair {
    pub fn generate() -> Self {
        let sk = CbSecretKey::generate(&mut rand::rngs::OsRng);
        let pk = sk.public_key();
        let mut public = [0u8; 32];
        public.copy_from_slice(pk.as_bytes());
        Self {
            public,
            secret: sk.to_bytes(),
        }
    }

    pub fn from_secret(secret: [u8; 32]) -> Self {
        let sk = CbSecretKey::from(secret);
        let pk = sk.public_key();
        let mut public = [0u8; 32];
        public.copy_from_slice(pk.as_bytes());
        Self { public, secret }
    }

    pub fn public_b64(&self) -> String {
        B64.encode(self.public)
    }

    /// Loads `~/.operon/system/.device_key`, creating a fresh keypair on first use.
    pub fn load_or_create(dir: &std::path::Path) -> Result<Self, String> {
        let kp = dir.join(FILE_DEVICE_KEY);
        if let Ok(hexs) = std::fs::read_to_string(&kp) {
            let mut secret = [0u8; 32];
            let h = hexs.trim();
            if h.len() == 64 {
                for i in 0..32 {
                    secret[i] =
                        u8::from_str_radix(&h[i * 2..i * 2 + 2], 16).map_err(|e| e.to_string())?;
                }
                return Ok(Self::from_secret(secret));
            }
        }
        let kp_new = Self::generate();
        std::fs::create_dir_all(dir).map_err(|e| e.to_string())?;
        let hexs: String = kp_new.secret.iter().map(|b| format!("{:02x}", b)).collect();
        std::fs::write(&kp, hexs).map_err(|e| e.to_string())?;
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let _ = std::fs::set_permissions(&kp, std::fs::Permissions::from_mode(0o600));
        }
        let _ = std::fs::write(
            dir.join(FILE_DEVICE_PUB),
            kp_new
                .public
                .iter()
                .map(|b| format!("{:02x}", b))
                .collect::<String>(),
        );
        Ok(kp_new)
    }
}

/// libsodium sealed-box nonce = BLAKE2b-192(epk || recipient_pk)
fn seal_nonce(epk: &[u8], recipient_pk: &[u8]) -> [u8; 24] {
    let mut h = Blake2bVar::new(24).expect("blake2b-192");
    h.update(epk);
    h.update(recipient_pk);
    let mut out = [0u8; 24];
    h.finalize_variable(&mut out).expect("blake2b out");
    out
}

/// libsodium-compatible sealed box: `epk(32) || ciphertext || tag(16)`
pub fn seal_box(recipient_pub: &[u8; 32], msg: &[u8]) -> Result<Vec<u8>, String> {
    let recipient = CbPublicKey::from(*recipient_pub);
    let eph = CbSecretKey::generate(&mut rand::rngs::OsRng);
    let eph_pub = eph.public_key();
    let sbox = SalsaBox::new(&recipient, &eph);
    let nz = seal_nonce(eph_pub.as_bytes(), recipient.as_bytes());
    let out = sbox
        .encrypt(GenericArray::from_slice(&nz), msg)
        .map_err(|_| "seal failed".to_string())?;
    let mut res = Vec::with_capacity(32 + out.len());
    res.extend_from_slice(eph_pub.as_bytes());
    res.extend_from_slice(&out);
    Ok(res)
}

/// Opens a libsodium-compatible sealed box with the device private key.
pub fn unseal_box(secret: &[u8; 32], public: &[u8; 32], sealed: &[u8]) -> Result<Vec<u8>, String> {
    if sealed.len() < 48 {
        return Err("sealed box too short".to_string());
    }
    let eph_pub = CbPublicKey::from_slice(&sealed[..32]).map_err(|e| e.to_string())?;
    let sk = CbSecretKey::from(*secret);
    let sbox = SalsaBox::new(&eph_pub, &sk);
    let nz = seal_nonce(eph_pub.as_bytes(), public);
    sbox.decrypt(GenericArray::from_slice(&nz), &sealed[32..])
        .map_err(|_| "unseal failed (wrong key or corrupted)".to_string())
}

/// XChaCha20-Poly1305 (IETF, ciphertext||tag) — values are encrypted client-side.
pub fn aead_encrypt(key: &[u8; 32], plaintext: &[u8]) -> (Vec<u8>, [u8; 24]) {
    let cipher = XChaCha20Poly1305::new(GenericArray::from_slice(key));
    let nonce = XChaCha20Poly1305::generate_nonce(&mut rand::rngs::OsRng);
    let ct = cipher.encrypt(&nonce, plaintext).expect("aead encrypt");
    let mut n = [0u8; 24];
    n.copy_from_slice(&nonce);
    (ct, n)
}

pub fn aead_decrypt(key: &[u8; 32], ciphertext: &[u8], nonce: &[u8]) -> Result<Vec<u8>, String> {
    if nonce.len() != 24 {
        return Err("nonce must be 24 bytes".to_string());
    }
    let cipher = XChaCha20Poly1305::new(GenericArray::from_slice(key));
    cipher
        .decrypt(XNonce::from_slice(nonce), ciphertext)
        .map_err(|_| "aead decrypt failed (wrong DEK or corrupted value)".to_string())
}

// ===========================================================================
// At-rest blob encryption (used for `~/.operon/system/.identity.json`)
// ===========================================================================

fn load_or_create_key_at(path: &std::path::Path) -> Result<[u8; KEY_LEN], String> {
    if let Ok(content) = std::fs::read_to_string(path) {
        return decode_key(content.trim());
    }
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let mut key = [0u8; KEY_LEN];
    rand::rngs::OsRng.fill_bytes(&mut key);
    let hex_key: String = key.iter().map(|b| format!("{:02x}", b)).collect();
    std::fs::write(path, hex_key).map_err(|e| e.to_string())?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let _ = std::fs::set_permissions(path, std::fs::Permissions::from_mode(0o600));
    }
    Ok(key)
}

/// Encrypts a UTF-8 blob for at-rest storage, keyed by `key_path` (auto-created 0600).
/// Returns a JSON envelope: `{"version":1,"alg":"AES-256-GCM","nonce":..,"ciphertext":..}`.
pub fn encrypt_at_rest(key_path: &std::path::Path, plaintext: &str) -> Result<String, String> {
    let key = load_or_create_key_at(key_path)?;
    let (nonce_b64, ct_b64) = encrypt(&key, plaintext)?;
    Ok(serde_json::json!({
        "version": WIRE_VERSION, "alg": "AES-256-GCM",
        "nonce": nonce_b64, "ciphertext": ct_b64
    })
    .to_string())
}

/// Decrypts an envelope produced by [`encrypt_at_rest`].
pub fn decrypt_at_rest(key_path: &std::path::Path, envelope: &str) -> Result<String, String> {
    let key = load_or_create_key_at(key_path)?;
    let v: serde_json::Value = serde_json::from_str(envelope).map_err(|e| e.to_string())?;
    let nonce = v.get("nonce").and_then(|n| n.as_str()).unwrap_or("");
    let ct = v.get("ciphertext").and_then(|n| n.as_str()).unwrap_or("");
    decrypt(&key, nonce, ct)
}
