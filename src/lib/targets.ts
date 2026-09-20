// Point-cloud TARGETS the entity morphs between. Each returns a Float32Array of
// length count*3. Every "event" in the film is "morph to target X" — so the
// vocabulary of shapes here IS the entity's behavioral vocabulary.

function fract(x: number) {
  return x - Math.floor(x);
}

/** Fibonacci sphere — the calm orb / dense core. */
export function sphere(count: number, radius = 1.5, out?: Float32Array): Float32Array {
  const a = out ?? new Float32Array(count * 3);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const theta = golden * i;
    a[i * 3] = Math.cos(theta) * r * radius;
    a[i * 3 + 1] = y * radius;
    a[i * 3 + 2] = Math.sin(theta) * r * radius;
  }
  return a;
}

/** Three offset clusters — the agentic split (E03). */
export function clusters3(count: number, radius = 0.7, sep = 2.1): Float32Array {
  const a = new Float32Array(count * 3);
  const centers = [
    [-sep, 0.4, 0],
    [sep, 0.4, 0],
    [0, -sep * 0.7, 0.3],
  ];
  const golden = Math.PI * (3 - Math.sqrt(5));
  const per = Math.ceil(count / 3);
  for (let i = 0; i < count; i++) {
    const g = Math.min(2, Math.floor(i / per));
    const j = i - g * per;
    const y = 1 - (j / (per - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * j;
    a[i * 3] = centers[g][0] + Math.cos(theta) * r * radius;
    a[i * 3 + 1] = centers[g][1] + y * radius;
    a[i * 3 + 2] = centers[g][2] + Math.sin(theta) * r * radius;
  }
  return a;
}

/** A node/edge graph — the living architecture / neural cloud (MIND, SYSTEM). */
export function network(count: number, nodesN = 26, radius = 2.0): Float32Array {
  const a = new Float32Array(count * 3);
  const golden = Math.PI * (3 - Math.sqrt(5));
  const nodes: [number, number, number][] = [];
  for (let i = 0; i < nodesN; i++) {
    const y = 1 - (i / (nodesN - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * i;
    nodes.push([
      Math.cos(theta) * r * radius,
      y * radius * 0.9,
      Math.sin(theta) * r * radius,
    ]);
  }
  // connect each node to its 2 nearest for edges
  const edges: [number, number][] = [];
  for (let i = 0; i < nodesN; i++) {
    const d = nodes
      .map((n, j) => [j, (n[0] - nodes[i][0]) ** 2 + (n[1] - nodes[i][1]) ** 2 + (n[2] - nodes[i][2]) ** 2] as [number, number])
      .filter(([j]) => j !== i)
      .sort((x, y2) => x[1] - y2[1]);
    edges.push([i, d[0][0]], [i, d[1][0]]);
  }
  const nodePts = Math.floor(count * 0.28);
  for (let i = 0; i < count; i++) {
    if (i < nodePts) {
      const n = nodes[i % nodesN];
      const jitter = 0.09;
      a[i * 3] = n[0] + (fract(Math.sin(i * 12.9) * 43758) - 0.5) * jitter;
      a[i * 3 + 1] = n[1] + (fract(Math.sin(i * 78.2) * 43758) - 0.5) * jitter;
      a[i * 3 + 2] = n[2] + (fract(Math.sin(i * 3.7) * 43758) - 0.5) * jitter;
    } else {
      const e = edges[i % edges.length];
      const t = fract(Math.sin(i * 91.3) * 43758);
      const p0 = nodes[e[0]];
      const p1 = nodes[e[1]];
      a[i * 3] = p0[0] + (p1[0] - p0[0]) * t;
      a[i * 3 + 1] = p0[1] + (p1[1] - p0[1]) * t;
      a[i * 3 + 2] = p0[2] + (p1[2] - p0[2]) * t;
    }
  }
  return a;
}

/** Per-point random seeds for the shader (scatter direction, size, phase). */
export function randoms(count: number): Float32Array {
  const a = new Float32Array(count * 3);
  for (let i = 0; i < count * 3; i++) a[i] = Math.random();
  return a;
}

/**
 * Sample a word into points by rendering it to an offscreen canvas and reading
 * filled pixels — typography that dissolves into the same particle field.
 * Browser only (uses canvas); returns a sphere fallback on the server.
 */
export function word(count: number, text: string, width = 6, out?: Float32Array): Float32Array {
  const a = out ?? new Float32Array(count * 3);
  if (typeof document === "undefined") return sphere(count, 1.5, a);
  const cw = 512;
  const ch = 160;
  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d");
  if (!ctx) return sphere(count, 1.5, a);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, cw, ch);
  ctx.fillStyle = "#fff";
  ctx.font = "800 120px Bricolage Grotesque, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, cw / 2, ch / 2 + 6);
  const data = ctx.getImageData(0, 0, cw, ch).data;
  const filled: number[] = [];
  for (let y = 0; y < ch; y += 2) {
    for (let x = 0; x < cw; x += 2) {
      if (data[(y * cw + x) * 4] > 128) filled.push(x, y);
    }
  }
  const aspect = ch / cw;
  const h = width * aspect;
  for (let i = 0; i < count; i++) {
    if (filled.length === 0) break;
    const k = (Math.floor(Math.random() * (filled.length / 2)) % (filled.length / 2)) * 2;
    const x = filled[k] / cw - 0.5;
    const y = filled[k + 1] / ch - 0.5;
    a[i * 3] = x * width;
    a[i * 3 + 1] = -y * h;
    a[i * 3 + 2] = (Math.random() - 0.5) * 0.2;
  }
  return a;
}
