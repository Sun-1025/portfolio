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

export function meshToPly(mesh, title = 'model') {
  const vertices = mesh.vertices;
  const faces = mesh.faces.filter((face) => face.length >= 3 && face.every((i) => vertices[i]));
  if (!vertices.length || !faces.length) throw new Error('模型里没有可导出的三角面');
  const out = [
    'ply',
    'format ascii 1.0',
    `comment Converted by Sun Zhihao tools / ${String(title).replace(/[\r\n]/g, ' ')}`,
    `element vertex ${vertices.length}`,
    'property float x',
    'property float y',
    'property float z',
    `element face ${faces.length}`,
    'property list uchar int vertex_indices',
    'end_header',
  ];
  for (const point of vertices) out.push(norm(point));
  for (const face of faces) {
    const triangle = face.length === 3 ? face : [face[0], face[1], face[2]];
    out.push(`3 ${triangle.join(' ')}`);
  }
  out.push('');
  return out.join('\n');
}

function plyTypeSize(type) {
  const map = {
    char: 1, uchar: 1, int8: 1, uint8: 1,
    short: 2, ushort: 2, int16: 2, uint16: 2,
    int: 4, uint: 4, int32: 4, uint32: 4,
    float: 4, float32: 4, double: 8, float64: 8,
  };
  return map[String(type).toLowerCase()] || 0;
}

function readPlyNumber(view, offset, type, littleEndian) {
  const lower = String(type).toLowerCase();
  if (['char', 'int8'].includes(lower)) return { value: view.getInt8(offset), size: 1 };
  if (['uchar', 'uint8'].includes(lower)) return { value: view.getUint8(offset), size: 1 };
  if (['short', 'int16'].includes(lower)) return { value: view.getInt16(offset, littleEndian), size: 2 };
  if (['ushort', 'uint16'].includes(lower)) return { value: view.getUint16(offset, littleEndian), size: 2 };
  if (['int', 'int32'].includes(lower)) return { value: view.getInt32(offset, littleEndian), size: 4 };
  if (['uint', 'uint32'].includes(lower)) return { value: view.getUint32(offset, littleEndian), size: 4 };
  if (['float', 'float32'].includes(lower)) return { value: view.getFloat32(offset, littleEndian), size: 4 };
  if (['double', 'float64'].includes(lower)) return { value: view.getFloat64(offset, littleEndian), size: 8 };
  return null;
}

export function parsePly(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if (!bytes.length) throw new Error('PLY 文件为空');
  const head = decodeUtf8(bytes.subarray(0, Math.min(bytes.length, 65536)));
  const headerEnd = head.indexOf('end_header');
  if (headerEnd < 0) throw new Error('PLY 缺少 end_header');
  const headerText = head.slice(0, headerEnd);
  const headerBytes = new TextEncoder().encode(head.slice(0, headerEnd + 'end_header'.length));
  let bodyOffset = headerBytes.length;
  while (bodyOffset < bytes.length && (bytes[bodyOffset] === 13 || bytes[bodyOffset] === 10)) bodyOffset += 1;
  const lines = headerText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!/^ply$/i.test(lines[0] || '')) throw new Error('不是 PLY 文件');
  let format = 'ascii';
  let littleEndian = true;
  const elements = [];
  let current = null;
  for (const line of lines.slice(1)) {
    if (/^comment/i.test(line) || /^obj_info/i.test(line)) continue;
    const formatMatch = line.match(/^format\s+(\S+)/i);
    if (formatMatch) {
      format = formatMatch[1].toLowerCase();
      littleEndian = format !== 'binary_big_endian';
      continue;
    }
    const elementMatch = line.match(/^element\s+(\S+)\s+(\d+)/i);
    if (elementMatch) {
      current = { name: elementMatch[1], count: Number(elementMatch[2]), properties: [] };
      elements.push(current);
      continue;
    }
    const propMatch = line.match(/^property\s+(list\s+)?(\S+)(?:\s+(\S+))?\s+(\S+)$/i);
    if (propMatch && current) {
      current.properties.push({
        list: Boolean(propMatch[1]),
        countType: propMatch[1] ? propMatch[2] : null,
        type: propMatch[1] ? propMatch[3] : propMatch[2],
        name: propMatch[4],
      });
    }
  }
  const vertexElement = elements.find((element) => element.name === 'vertex');
  const faceElement = elements.find((element) => element.name === 'face');
  if (!vertexElement || !faceElement) throw new Error('PLY 缺少 vertex 或 face 元素');
  const vertices = [];
  const faces = [];
  const parseFace = (indices) => {
    for (let i = 1; i + 1 < indices.length; i += 1) faces.push([indices[0], indices[i], indices[i + 1]]);
  };

  if (format === 'ascii') {
    const bodyLines = decodeUtf8(bytes.subarray(bodyOffset)).split(/\r?\n/);
    let cursor = 0;
    for (let i = 0; i < vertexElement.count; i += 1) {
      while (cursor < bodyLines.length && !bodyLines[cursor].trim()) cursor += 1;
      if (cursor >= bodyLines.length) throw new Error('PLY 顶点数据不足');
      const parts = bodyLines[cursor].trim().split(/\s+/);
      cursor += 1;
      const point = [0, 0, 0];
      let axis = 0;
      for (const property of vertexElement.properties) {
        const value = Number(parts.shift());
        if (property.name === 'x') point[0] = value;
        else if (property.name === 'y') point[1] = value;
        else if (property.name === 'z') point[2] = value;
        axis += 1;
        void axis;
      }
      vertices.push(point);
    }
    for (let i = 0; i < faceElement.count; i += 1) {
      while (cursor < bodyLines.length && !bodyLines[cursor].trim()) cursor += 1;
      if (cursor >= bodyLines.length) break;
      const parts = bodyLines[cursor].trim().split(/\s+/).map(Number);
      cursor += 1;
      const count = parts.shift();
      const indices = parts.slice(0, count).filter((n) => Number.isInteger(n) && n >= 0 && n < vertices.length);
      if (indices.length >= 3) parseFace(indices);
    }
  } else if (format === 'binary_little_endian' || format === 'binary_big_endian') {
    const view = new DataView(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
    let offset = bodyOffset;
    for (let i = 0; i < vertexElement.count; i += 1) {
      const point = [0, 0, 0];
      for (const property of vertexElement.properties) {
        if (property.list) throw new Error('不支持顶点里的 list 属性');
        const read = readPlyNumber(view, offset, property.type, littleEndian);
        if (!read) throw new Error(`不支持的 PLY 类型 ${property.type}`);
        offset += read.size;
        if (property.name === 'x') point[0] = read.value;
        else if (property.name === 'y') point[1] = read.value;
        else if (property.name === 'z') point[2] = read.value;
      }
      vertices.push(point);
    }
    for (let i = 0; i < faceElement.count; i += 1) {
      const listProp = faceElement.properties.find((property) => property.list);
      if (!listProp) break;
      const countRead = readPlyNumber(view, offset, listProp.countType, littleEndian);
      if (!countRead) throw new Error(`不支持的 PLY 计数类型 ${listProp.countType}`);
      offset += countRead.size;
      const indices = [];
      for (let j = 0; j < countRead.value; j += 1) {
        const read = readPlyNumber(view, offset, listProp.type, littleEndian);
        if (!read) throw new Error(`不支持的 PLY 索引类型 ${listProp.type}`);
        offset += read.size;
        if (read.value >= 0 && read.value < vertices.length) indices.push(read.value);
      }
      if (indices.length >= 3) parseFace(indices);
    }
  } else {
    throw new Error(`不支持的 PLY 格式 ${format}`);
  }
  return buildMesh(vertices, faces);
}

export function convertModel(buffer, from, to) {
  const mesh = from === 'stl' ? parseStl(buffer)
    : from === 'obj' ? parseObj(decodeUtf8(new Uint8Array(buffer)))
      : parsePly(buffer);
  if (to === 'obj') return meshToObj(mesh, `${from}-model`);
  if (to === 'stl') return meshToStl(mesh, `${from}-model`);
  if (to === 'ply') return meshToPly(mesh, `${from}-model`);
  throw new Error(`暂不支持 ${from.toUpperCase()} → ${to.toUpperCase()}`);
}
