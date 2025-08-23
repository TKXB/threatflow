// Node 18+ required (global fetch)
const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:8889';

const otm = {
  otmVersion: '0.1',
  name: 'S',
  projects: [],
  trustZones: [],
  components: [
    { id: 'a', name: 'A', type: 'process' },
    { id: 'b', name: 'B', type: 'store' },
  ],
  dataflows: [],
  threats: [],
  mitigations: [],
  risks: [],
};

async function call(path, payload) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${path} failed: ${res.status} ${text}`);
  }
  return await res.json();
}

async function main() {
  console.log('Base URL:', baseUrl);
  let cur = otm;
  // 1) add dataflow
  cur = await call('/otm/dataflow', {
    otm: cur,
    op: { action: 'add', dataflow: { id: 'f1', source: 'a', destination: 'b', protocol: 'http' } },
  });
  console.log('Dataflows:', cur.dataflows);

  // 2) add trust zone and assign
  cur = await call('/otm/trustzone', {
    otm: cur,
    op: { action: 'add', trustZone: { id: 'tz2', name: 'TZ2' } },
  });
  cur = await call('/otm/trustzone', {
    otm: cur,
    op: { action: 'assign', componentId: 'a', trustZoneId: 'tz2' },
  });
  console.log('Components:', cur.components);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

