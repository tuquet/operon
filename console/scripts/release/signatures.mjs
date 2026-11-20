import { Buffer } from 'node:buffer';
import { createHash, createPublicKey, verify } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readFile } from 'node:fs/promises';

export async function fileHash(file, algorithm = 'sha256') {
  const hash = createHash(algorithm);
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest();
}

export async function fileDigest(file) {
  const digest = await fileHash(file);
  return digest.toString('hex');
}

/** Verify both Minisign signatures using Node's Ed25519 implementation.
 * Packet format: https://github.com/jedisct1/minisign/blob/master/src/minisign.c
 */
export async function verifyArtifactSignature(
  file,
  encodedSignature,
  encodedPublicKey,
  expectedVersion,
) {
  const keyLines = Buffer.from(encodedPublicKey, 'base64')
    .toString('utf8')
    .trimEnd()
    .split(/\r?\n/);
  const signatureLines = Buffer.from(encodedSignature, 'base64')
    .toString('utf8')
    .trimEnd()
    .split(/\r?\n/);
  if (
    keyLines.length !== 2 ||
    signatureLines.length !== 4 ||
    !keyLines[0].startsWith('untrusted comment: ') ||
    !signatureLines[0].startsWith('untrusted comment: ') ||
    !signatureLines[2].startsWith('trusted comment: ')
  )
    throw new Error('Malformed Tauri updater signature or public key');
  const key = Buffer.from(keyLines[1], 'base64');
  const packet = Buffer.from(signatureLines[1], 'base64');
  const globalSignature = Buffer.from(signatureLines[3], 'base64');
  if (
    key.length !== 42 ||
    packet.length !== 74 ||
    globalSignature.length !== 64 ||
    key.subarray(0, 2).toString() !== 'Ed' ||
    !packet.subarray(2, 10).equals(key.subarray(2, 10))
  )
    throw new Error(
      'Updater signature key does not match configured public key',
    );
  const algorithm = packet.subarray(0, 2).toString();
  if (!['ED', 'Ed'].includes(algorithm))
    throw new Error('Unsupported updater signature algorithm');
  const publicKey = createPublicKey({
    key: Buffer.concat([
      Buffer.from('302a300506032b6570032100', 'hex'),
      key.subarray(10),
    ]),
    format: 'der',
    type: 'spki',
  });
  const signature = packet.subarray(10);
  const message =
    algorithm === 'ED'
      ? await fileHash(file, 'blake2b512')
      : await readFile(file);
  const comment = signatureLines[2].slice('trusted comment: '.length);
  if (
    expectedVersion &&
    comment.split('\t').find((field) => field.startsWith('version:')) !==
      `version:${expectedVersion}`
  )
    throw new Error('Updater signature is not bound to the announced version');
  if (
    !verify(null, message, publicKey, signature) ||
    !verify(
      null,
      Buffer.concat([signature, Buffer.from(comment)]),
      publicKey,
      globalSignature,
    )
  )
    throw new Error('Updater signature verification failed');
}
