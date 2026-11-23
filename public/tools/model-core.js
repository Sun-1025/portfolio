/* 三角网格互换：STL（ASCII/二进制）与 OBJ。只处理几何，不处理材质。 */

const decoder = typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-8', { fatal: false }) : null;

function decodeUtf8(bytes) {
  if (decoder) return decoder.decode(bytes);
  let out = '';
  for (let i = 0; i < bytes.length; i += 1) out += String.fromCharCode(bytes[i]);
  return out;
}

function cleanNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function norm(values) {
  return values.map((v) => v.toFixed(6)).join(' ');
}

function triangleNormal(a, b, c) {
  const ux = b[0] - a[0];
  const uy = b[1] - a[1];
  const uz = b[2] - a[2];
  const vx = c[0] - a[0];
  const vy = c[1] - a[1];
  const vz = c[2] - a[2];
  let nx = uy * vz - uz * vy;
  let ny = uz * vx - ux * vz;
  let nz = ux * vy - uy * vx;
  const length = Math.hypot(nx, ny, nz);
  if (!length) return [0, 0, 1];
  nx /= length; ny /= length; nz /= length;
  return [nx, ny, nz];
}

function buildMesh(vertices, faces) {
  if (!vertices.length) throw new Error('模型里没有顶点');
  if (!faces.length) throw new Error('模型里没有三角面');
  return { vertices, faces };
}

export function parseStl(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if (!bytes.length) throw new Error('STL 文件为空');
  const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const head = decodeUtf8(bytes.subarray(0, Math.min(bytes.length, 2048)));
  const ascii = /^\s*solid/i.test(head) && /facet\s+normal/i.test(head) && /vertex\s/i.test(head);
  const count = bytes.length >= 84 ? new DataView(arrayBuffer).getUint32(80, true) : 0;
  if (!ascii && count > 0 && bytes.length >= 84 + count * 50) {
    const view = new DataView(arrayBuffer);
    const vertices = [];
    const faces = [];
    let offset = 84;
    for (let i = 0; i < count; i += 1) {
      offset += 12; // normal
      const start = vertices.length;
      for (let v = 0; v < 3; v += 1) {
        vertices.push([
          view.getFloat32(offset, true),
          view.getFloat32(offset + 4, true),
          view.getFloat32(offset + 8, true),
        ]);
        offset += 12;
      }
      offset += 2; // attribute byte count
      faces.push([start, start + 1, start + 2]);
    }
    return buildMesh(vertices, faces);
  }
  if (!ascii) throw new Error('无法识别 STL 格式（需要 ASCII 或二进制 STL）');
  const vertices = [];
  const faces = [];
  const re = /vertex\s+([-+0-9.eE]+)\s+([-+0-9.eE]+)\s+([-+0-9.eE]+)/g;
  let match;
  while ((match = re.exec(head)) !== null) {
    const start = vertices.length;
    vertices.push([cleanNumber(match[1]), cleanNumber(match[2]), cleanNumber(match[3])]);
    if (vertices.length % 3 === 0) faces.push([start - 2, start - 1, start]);
  }
  // 头部只读到 2KB，ASCII STL 可能更长，继续读全文。
  if (bytes.length > 2048) {
    const full = decodeUtf8(bytes);
    vertices.length = 0;
    faces.length = 0;
    re.lastIndex = 0;
    while ((match = re.exec(full)) !== null) {
      const start = vertices.length;
      vertices.push([cleanNumber(match[1]), cleanNumber(match[2]), cleanNumber(match[3])]);
      if (vertices.length % 3 === 0) faces.push([start - 2, start - 1, start]);
    }
  }
  return buildMesh(vertices, faces);
}

export function parseObj(text) {
  const vertices = [];
  const faces = [];
  for (const raw of String(text || '').replace(/\r\n/g, '\n').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const parts = line.split(/\s+/);
    if (parts[0] === 'v' && parts.length >= 4) {
      vertices.push([cleanNumber(parts[1]), cleanNumber(parts[2]), cleanNumber(parts[3])]);
    } else if (parts[0] === 'f' && parts.length >= 4) {
      const indices = [];
      for (const token of parts.slice(1)) {
        const rawIndex = Number(token.split('/')[0]);
        if (!Number.isInteger(rawIndex) || rawIndex === 0) continue;
        const index = rawIndex < 0 ? vertices.length + rawIndex : rawIndex - 1;
        if (index >= 0 && index < vertices.length) indices.push(index);
      }
      for (let i = 1; i + 1 < indices.length; i += 1) {
        faces.push([indices[0], indices[i], indices[i + 1]]);
      }
    }
  }
  return buildMesh(vertices, faces);
}

export function meshToObj(mesh, title = 'model') {
  const map = new Map();
  const vertices = [];
  const faces = [];
  const indexFor = (point) => {
    const key = `${point[0].toFixed(6)},${point[1].toFixed(6)},${point[2].toFixed(6)}`;
    if (map.has(key)) return map.get(key);
    const index = vertices.length;
    map.set(key, index);
    vertices.push(point);
    return index;
  };
  for (const face of mesh.faces) {
    faces.push(face.map((i) => indexFor(mesh.vertices[i]) + 1));
  }
  const out = [`# Converted by Sun Zhihao tools / ${String(title).replace(/\s+/g, '_')}`, 'o model', ''];
  for (const p of vertices) out.push(`v ${norm(p)}`);
  out.push('');
  for (const f of faces) out.push(`f ${f.join(' ')}`);
  out.push('');
  return out.join('\n');
}

export function meshToStl(mesh, title = 'model') {
  const safeTitle = String(title || 'model').replace(/[\r\n]/g, ' ').slice(0, 80) || 'model';
  const out = [`solid ${safeTitle}`];
  for (const face of mesh.faces) {
    const a = mesh.vertices[face[0]];
    const b = mesh.vertices[face[1]];
    const c = mesh.vertices[face[2]];
    if (!a || !b || !c) continue;
    const normal = triangleNormal(a, b, c);
    out.push(`  facet normal ${norm(normal)}`, '    outer loop',
      `      vertex ${norm(a)}`, `      vertex ${norm(b)}`, `      vertex ${norm(c)}`,
      '    endloop', '  endfacet');
  }
  out.push(`endsolid ${safeTitle}`, '');
  return out.join('\n');
}

export function convertModel(buffer, from, to) {
  if (from === 'stl' && to === 'obj') {
    return meshToObj(parseStl(buffer), 'stl-model');
  }
  if (from === 'obj' && to === 'stl') {
    const text = decodeUtf8(new Uint8Array(buffer));
    return meshToStl(parseObj(text), 'obj-model');
  }
  throw new Error(`暂不支持 ${from.toUpperCase()} → ${to.toUpperCase()}`);
}
