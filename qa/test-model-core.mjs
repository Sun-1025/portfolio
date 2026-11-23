import assert from 'node:assert/strict';
import { convertModel, parseObj, parseStl } from '../public/tools/model-core.js';

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

console.log('model-core tests: OK');
