import assert from 'node:assert/strict';
import { convertModel, parseObj, parseStl, parsePly } from '../public/tools/model-core.js';

const obj = `
# tetra
v 0 0 0
v 1 0 0
v 0 1 0
v 0 0 1
f 1 2 3
f 1 2 4
f 1 3 4
f 2 3 4
`;
const stl = convertModel(new TextEncoder().encode(obj), 'obj', 'stl');
assert.match(stl, /^solid /);
assert.equal((stl.match(/facet normal/g) || []).length, 4);
const back = convertModel(new TextEncoder().encode(stl), 'stl', 'obj');
assert.equal((back.match(/^v /gm) || []).length, 4);
assert.equal((back.match(/^f /gm) || []).length, 4);
assert.equal(parseObj(obj).faces.length, 4);

const asciiStl = `solid one
facet normal 0 0 1
 outer loop
  vertex 0 0 0
  vertex 1 0 0
  vertex 0 1 0
 endloop
endfacet
endsolid one`;
assert.equal(parseStl(new TextEncoder().encode(asciiStl)).faces.length, 1);

const binary = new ArrayBuffer(84 + 50);
const view = new DataView(binary);
new Uint8Array(binary).set(new TextEncoder().encode('binary'), 0);
view.setUint32(80, 1, true);
view.setFloat32(96, 1, true);
view.setFloat32(100, 0, true);
view.setFloat32(104, 0, true);
view.setFloat32(108, 0, true);
view.setFloat32(112, 1, true);
view.setFloat32(116, 0, true);
view.setFloat32(120, 0, true);
view.setFloat32(124, 0, true);
view.setFloat32(128, 0, true);
const binaryMesh = parseStl(binary);
assert.equal(binaryMesh.faces.length, 1);
assert.deepEqual(binaryMesh.vertices[1], [0, 1, 0]);

const ply = `ply
format ascii 1.0
element vertex 3
property float x
property float y
property float z
element face 1
property list uchar int vertex_indices
end_header
0 0 0
1 0 0
0 1 0
3 0 1 2
`;
const plyMesh = parsePly(new TextEncoder().encode(ply));
assert.equal(plyMesh.vertices.length, 3);
assert.equal(plyMesh.faces.length, 1);
const plyText = convertModel(new TextEncoder().encode(obj), 'obj', 'ply');
assert.match(plyText, /^ply\nformat ascii 1.0/);
assert.match(plyText, /element vertex 4/);
assert.match(plyText, /element face 4/);
const fromPly = convertModel(new TextEncoder().encode(ply), 'ply', 'obj');
assert.equal((fromPly.match(/^v /gm) || []).length, 3);
assert.equal((fromPly.match(/^f /gm) || []).length, 1);

console.log('model-core tests: OK');
