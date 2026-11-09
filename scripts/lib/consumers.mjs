// Reads one consumer's kit copy through an injected fetchFile, and says which files differ from its own VERSION.
import crypto from 'node:crypto';

const sha256 = body => crypto.createHash('sha256').update(body).digest('hex');

// fetchFile(repo, path) -> Promise<Buffer | null>: null is "no such file"; a throw or undefined is "could not reach".
// -> { copyVersion: string | null, modified: string[], unreachable: boolean }
export async function readConsumer({ repo, folder }, fetchFile) {
  const unreachable = { copyVersion: null, modified: [], unreachable: true };
  let raw;
  try { raw = await fetchFile(repo, `${folder}/VERSION`); } catch { return unreachable; }
  if (raw === undefined) return unreachable;
  if (raw === null) return { copyVersion: null, modified: [], unreachable: false };
  let meta;
  try { meta = JSON.parse(Buffer.from(raw).toString('utf8')); } catch { meta = null; }
  if (!meta || typeof meta !== 'object' || typeof meta.version !== 'string') {
    return { copyVersion: null, modified: [], unreachable: false };
  }
  const files = meta.files && typeof meta.files === 'object' && !Array.isArray(meta.files) ? meta.files : {};
  const modified = [];
  for (const [name, want] of Object.entries(files)) {
    let body;
    try { body = await fetchFile(repo, `${folder}/${name}`); } catch { return unreachable; }
    if (body === undefined) return unreachable;
    if (body === null || sha256(body) !== want) modified.push(name);
  }
  return { copyVersion: meta.version, modified, unreachable: false };
}
