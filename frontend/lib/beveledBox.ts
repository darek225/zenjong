/**
 * Beveled (chamfered) Box Geometry
 * Generates a chunky 3D box with chamfered edges for mahjong tiles.
 * Each face consists of a flat center quad, 4 angled bevel strips, and 4 corner triangles.
 */
import * as THREE from "three";

export function createBeveledBox(
  width: number,
  height: number,
  depth: number,
  bevel: number = 0.06,
  bevelSegments: number = 1
): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();

  // Helper to compute vertex with bevel offset on a face
  // We build 6 faces, each with a flat center + beveled edges

  const w = width / 2;
  const h = height / 2;
  const d = depth / 2;
  const b = Math.min(bevel, Math.min(w, h, d) * 0.5);

  // For each face, we generate:
  // - 4 corner vertices (outer)
  // - 4 edge-mid vertices (outer, at bevel start)
  // - 4 inner vertices (flat face inset by bevel)
  // Then triangulate: center quad + 4 bevel quads (each split into 2 tris) + 4 corner tris

  const vertices: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  // Face definitions: [normal axis, sign, uAxis, vAxis]
  // axis 0 = X, axis 1 = Y, axis 2 = Z
  const faces: Array<{
    axis: number;
    sign: number;
    uAxis: number;
    vAxis: number;
  }> = [
    { axis: 0, sign: 1, uAxis: 2, vAxis: 1 },  // +X (right)
    { axis: 0, sign: -1, uAxis: 2, vAxis: 1 }, // -X (left)
    { axis: 1, sign: 1, uAxis: 0, vAxis: 2 },  // +Y (top)
    { axis: 1, sign: -1, uAxis: 0, vAxis: 2 }, // -Y (bottom)
    { axis: 2, sign: 1, uAxis: 0, vAxis: 1 },  // +Z (front)
    { axis: 2, sign: -1, uAxis: 0, vAxis: 1 }, // -Z (back)
  ];

  for (const face of faces) {
    const { axis, sign, uAxis, vAxis } = face;
    const baseIndex = vertices.length / 8; // each vertex: 3 pos + 3 normal + 2 uv

    // Compute the fixed coordinate for this face
    const fixedCoord = sign * (axis === 0 ? w : axis === 1 ? h : d);
    const inset = b;

    // Half-extents in UV space
    const uHalf = (axis === 0 ? depth : axis === 1 ? depth : width) / 2;
    const vHalf = (axis === 1 ? width : axis === 2 ? width : height) / 2;

    // Generate 9 vertices for this face:
    // Outer corners (4): at full extent
    // Outer edge midpoints (4): at bevel start
    // Inner corners (4): inset by bevel
    // Center (1): inset by bevel

    const outerCorners: number[][] = [];
    const edgeMids: number[][] = [];
    const innerCorners: number[][] = [];

    const cornerDirs = [
      [-1, -1], [1, -1], [1, 1], [-1, 1], // CCW order
    ];

    for (const [us, vs] of cornerDirs) {
      // Outer corner
      const pos: number[] = [0, 0, 0];
      pos[axis] = fixedCoord;
      pos[uAxis] = us * uHalf;
      pos[vAxis] = vs * vHalf;
      outerCorners.push(pos);

      // Edge midpoint (where bevel starts)
      const mid: number[] = [0, 0, 0];
      mid[axis] = fixedCoord;
      mid[uAxis] = us * uHalf;
      mid[vAxis] = vs * vHalf;
      edgeMids.push(mid);

      // Inner corner (inset by bevel)
      const inner: number[] = [0, 0, 0];
      inner[axis] = fixedCoord;
      inner[uAxis] = us * (uHalf - inset);
      inner[vAxis] = vs * (vHalf - inset);
      innerCorners.push(inner);
    }

    // Center
    const center: number[] = [0, 0, 0];
    center[axis] = fixedCoord;
    center[uAxis] = 0;
    center[vAxis] = 0;

    // Add all vertices: 4 outer corners, 4 edge mids, 4 inner corners, 1 center
    const allVerts = [...outerCorners, ...edgeMids, ...innerCorners, center];
    const vertIndices = allVerts.map((_, i) => baseIndex + i);

    // Push vertices with normals and UVs
    for (let i = 0; i < allVerts.length; i++) {
      const pos = allVerts[i];
      vertices.push(pos[0], pos[1], pos[2]);

      // Normal: pointing outward from face
      const normal: number[] = [0, 0, 0];
      normal[axis] = sign;
      normals.push(normal[0], normal[1], normal[2]);

      // UV: map from face space to 0-1
      const u = (pos[uAxis] + uHalf) / (2 * uHalf);
      const v = (pos[vAxis] + vHalf) / (2 * vHalf);
      uvs.push(u, v);
    }

    // Indices for this face:
    // Outer corners: 0,1,2,3
    // Edge mids: 4,5,6,7
    // Inner corners: 8,9,10,11
    // Center: 12

    // Center quad: 12, 8, 9, 10, 11 (fan from center)
    indices.push(12, 8, 9);
    indices.push(12, 9, 10);
    indices.push(12, 10, 11);
    indices.push(12, 11, 8);

    // Bevel strips (between edge mid and inner corner):
    // Edge 0 (between corner 0 and 1): mid 4, mid 5, inner 9, inner 8
    for (let i = 0; i < 4; i++) {
      const next = (i + 1) % 4;
      const midA = 4 + i;
      const midB = 4 + next;
      const innerA = 8 + i;
      const innerB = 8 + next;
      // Triangulate the bevel quad
      indices.push(midA, innerA, innerB);
      indices.push(midA, innerB, midB);
    }

    // Corner triangles (between outer corner and adjacent edge mids):
    for (let i = 0; i < 4; i++) {
      const prev = (i + 3) % 4;
      const corner = i;
      const midPrev = 4 + prev;
      const midCurr = 4 + i;
      indices.push(corner, midPrev, midCurr);
    }
  }

  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);

  geometry.computeVertexNormals();
  geometry.boundingSphere = new THREE.Sphere();
  geometry.computeBoundingSphere();

  return geometry;
}