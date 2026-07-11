import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto"

import { getBetterAuthSecret, getEmailImportEncryptionKey } from "@/lib/env.server"

// Format: v1:{iv_b64}:{tag_b64}:{ciphertext_b64}
const SECRET_FORMAT_VERSION = "v1"
const KEY_DERIVATION_SALT = "flamette-money:email-import:v1"
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16

export class SecretDecryptError extends Error {
  constructor(message = "Stored secret can no longer be decrypted. Re-enter it to continue.") {
    super(message)
    this.name = "SecretDecryptError"
  }
}

let cachedKey: Buffer | null = null
let cachedKeySource: string | null = null

function getEncryptionKey() {
  const secret = getEmailImportEncryptionKey() ?? getBetterAuthSecret()
  if (!cachedKey || cachedKeySource !== secret) {
    cachedKey = scryptSync(secret, KEY_DERIVATION_SALT, 32)
    cachedKeySource = secret
  }
  return cachedKey
}

export function encryptSecret(plaintext: string) {
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv, { authTagLength: AUTH_TAG_LENGTH })
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()

  return [SECRET_FORMAT_VERSION, iv.toString("base64"), tag.toString("base64"), ciphertext.toString("base64")].join(":")
}

export function decryptSecret(payload: string) {
  const parts = payload.split(":")
  if (parts.length !== 4 || parts[0] !== SECRET_FORMAT_VERSION) {
    throw new SecretDecryptError()
  }

  try {
    const iv = Buffer.from(parts[1], "base64")
    const tag = Buffer.from(parts[2], "base64")
    const ciphertext = Buffer.from(parts[3], "base64")
    const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), iv, { authTagLength: AUTH_TAG_LENGTH })
    decipher.setAuthTag(tag)
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8")
  } catch {
    throw new SecretDecryptError()
  }
}
