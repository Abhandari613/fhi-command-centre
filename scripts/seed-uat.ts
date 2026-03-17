/**
 * UAT Seed Script — Simulates 2 years of Frank's Home Improvement operations
 *
 * Inserts realistic, interconnected data across ALL tables:
 * Clients, Subcontractors, Properties, Buildings, Units, Turnovers,
 * Jobs (all statuses), Tasks, Photos, Events, Assignments,
 * Finance Transactions, Payouts, Recurring Schedules, Notifications,
 * Email Logs, Work Orders, and Outcome Engine entities.
 *
 * Usage: npx tsx scripts/seed-uat.ts
 * Teardown: npx tsx scripts/seed-teardown.ts
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";

// ─── ENV SETUP ───────────────────────────────────────────────────────────────

const envPath = path.resolve(process.cwd(), ".env.local");
dotenv.config({ path: envPath });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── SEEDED PRNG (deterministic randomness) ──────────────────────────────────

let _seed = 42;
function seededRandom(): number {
  _seed = (_seed * 16807 + 0) % 2147483647;
  return (_seed - 1) / 2147483646;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(seededRandom() * arr.length)];
}

function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => seededRandom() - 0.5);
  return shuffled.slice(0, n);
}

function randomInt(min: number, max: number): number {
  return Math.floor(seededRandom() * (max - min + 1)) + min;
}

function randomAmount(min: number, max: number): number {
  return Math.round((seededRandom() * (max - min) + min) * 100) / 100;
}

function randomDate(start: Date, end: Date): Date {
  return new Date(
    start.getTime() + seededRandom() * (end.getTime() - start.getTime()),
  );
}

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function formatTimestamp(d: Date): string {
  return d.toISOString();
}

// ─── SEED TAG (for teardown identification) ──────────────────────────────────

const SEED_TAG = "SEED-UAT";

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const JOB_STATUSES = [
  "incoming",
  "draft",
  "quoted",
  "sent",
  "approved",
  "scheduled",
  "in_progress",
  "completed",
  "invoiced",
  "paid",
  "cancelled",
] as const;

const PHOTO_TYPES = [
  "before",
  "after",
  "completion",
  "other",
  "punch_list",
] as const;

const TRADES = [
  "Painting",
  "Electrical",
  "Plumbing",
  "HVAC",
  "Cleaning",
  "General",
  "Carpentry",
  "Flooring",
];

const NJ_STREETS = [
  "Oak Street",
  "Maple Avenue",
  "Pine Street",
  "Elm Court",
  "Birch Lane",
  "Cedar Road",
  "Walnut Drive",
  "Spruce Way",
  "Chestnut Boulevard",
  "Willow Place",
  "Main Street",
  "Park Avenue",
  "Washington Street",
  "Franklin Boulevard",
  "Lincoln Drive",
  "River Road",
  "Lake Street",
  "Hill Avenue",
  "Valley Drive",
  "Meadow Lane",
];

const NJ_CITIES = [
  "Newark, NJ",
  "Jersey City, NJ",
  "Paterson, NJ",
  "Elizabeth, NJ",
  "Clifton, NJ",
  "Trenton, NJ",
  "Camden, NJ",
  "Passaic, NJ",
  "Union City, NJ",
  "Bayonne, NJ",
  "East Orange, NJ",
  "Vineland, NJ",
  "New Brunswick, NJ",
  "Hoboken, NJ",
  "Perth Amboy, NJ",
];

const UNIT_NUMBERS = [
  "101",
  "102",
  "103",
  "104",
  "201",
  "202",
  "203",
  "204",
  "301",
  "302",
  "303",
  "304",
  "401",
  "402",
  "403",
  "404",
];

function randomAddress(): string {
  return `${randomInt(1, 500)} ${pick(NJ_STREETS)}, ${pick(NJ_CITIES)} ${randomInt(7000, 7999).toString().padStart(5, "0")}`;
}

// ─── PHOTO URLS ──────────────────────────────────────────────────────────────

// Deterministic stock construction images via picsum with seeds
function stockPhotoUrl(seed: number, width = 800, height = 600): string {
  return `https://picsum.photos/seed/fhi-${seed}/${width}/${height}`;
}

// ─── CATALOG OF SERVICES (saved_rates) ───────────────────────────────────────

const CATALOG_ITEMS = [
  {
    task_name: "Interior Painting - Per Room",
    unit_price: 350,
    item_type: "labor",
    category: "Painting",
  },
  {
    task_name: "Ceiling Painting - Per Room",
    unit_price: 200,
    item_type: "labor",
    category: "Painting",
  },
  {
    task_name: "Trim & Baseboard Painting",
    unit_price: 150,
    item_type: "labor",
    category: "Painting",
  },
  {
    task_name: "Drywall Patch - Small",
    unit_price: 75,
    item_type: "labor",
    category: "General",
  },
  {
    task_name: "Drywall Patch - Large",
    unit_price: 175,
    item_type: "labor",
    category: "General",
  },
  {
    task_name: "GFCI Outlet Install",
    unit_price: 85,
    item_type: "labor",
    category: "Electrical",
  },
  {
    task_name: "Outlet Replacement",
    unit_price: 45,
    item_type: "labor",
    category: "Electrical",
  },
  {
    task_name: "Light Fixture Install",
    unit_price: 120,
    item_type: "labor",
    category: "Electrical",
  },
  {
    task_name: "Exhaust Fan Replacement",
    unit_price: 195,
    item_type: "labor",
    category: "Electrical",
  },
  {
    task_name: "Faucet Replacement",
    unit_price: 165,
    item_type: "labor",
    category: "Plumbing",
  },
  {
    task_name: "Toilet Repair",
    unit_price: 125,
    item_type: "labor",
    category: "Plumbing",
  },
  {
    task_name: "Caulking - Bathroom",
    unit_price: 60,
    item_type: "labor",
    category: "Plumbing",
  },
  {
    task_name: "HVAC Service Call",
    unit_price: 250,
    item_type: "labor",
    category: "HVAC",
  },
  {
    task_name: "Furnace Repair",
    unit_price: 450,
    item_type: "labor",
    category: "HVAC",
  },
  {
    task_name: "Deep Clean - Unit",
    unit_price: 300,
    item_type: "labor",
    category: "Cleaning",
  },
  {
    task_name: "Carpet Cleaning",
    unit_price: 175,
    item_type: "labor",
    category: "Cleaning",
  },
  {
    task_name: "Oven & Range Clean",
    unit_price: 85,
    item_type: "labor",
    category: "Cleaning",
  },
  {
    task_name: "Cabinet Door Repair",
    unit_price: 95,
    item_type: "labor",
    category: "Carpentry",
  },
  {
    task_name: "Door Adjustment/Repair",
    unit_price: 75,
    item_type: "labor",
    category: "Carpentry",
  },
  {
    task_name: "Vanity Replacement",
    unit_price: 350,
    item_type: "labor",
    category: "Plumbing",
  },
  {
    task_name: "Full Unit Turnover",
    unit_price: 2500,
    item_type: "flat_rate",
    category: "General",
  },
  {
    task_name: "Paint - 5 Gal Bucket",
    unit_price: 185,
    item_type: "material",
    category: "Painting",
  },
  {
    task_name: "Drywall Compound & Tape",
    unit_price: 35,
    item_type: "material",
    category: "General",
  },
  {
    task_name: "Caulk & Sealant Kit",
    unit_price: 25,
    item_type: "material",
    category: "Plumbing",
  },
  {
    task_name: "Flooring - LVP Per Sqft",
    unit_price: 4.5,
    item_type: "material",
    category: "Flooring",
  },
];

// ─── EMAIL FIXTURES (real dispatcher emails) ─────────────────────────────────

const DISPATCHERS = [
  {
    name: "Meryl Thompson",
    email: "meryl@allprofessionaltrades.com",
    role: "dispatcher" as const,
  },
  {
    name: "Cole Mitchell",
    email: "cole@allprofessionaltrades.com",
    role: "dispatcher" as const,
  },
  {
    name: "Neil Henderson",
    email: "neilh@allprofessionaltrades.com",
    role: "dispatcher" as const,
  },
  {
    name: "Coady Gallant",
    email: "coady@allprofessionaltrades.com",
    role: "billing" as const,
  },
];

const EMAIL_SUBJECTS_BY_TRADE: Record<string, string[]> = {
  Painting: [
    "Paint Job: {address} - Interior Repaint",
    "Work Order: {address} - Kitchen & Living Room Paint",
    "Painting Needed: {address} - Full Unit",
    "Touch-up Paint: {address} - Hallway & Bedrooms",
  ],
  Electrical: [
    "Electrical: {address} - Outlet Issues",
    "URGENT: {address} - No Power in Unit",
    "Work Order: {address} - Light Fixtures",
    "Electrical Repair: {address} - GFCI & Exhaust Fan",
  ],
  Plumbing: [
    "Plumbing: {address} - Kitchen Faucet Leak",
    "URGENT: {address} - Toilet Overflow",
    "Work Order: {address} - Bathroom Fixtures",
    "Plumbing Repair: {address} - Multiple Items",
  ],
  HVAC: [
    "URGENT: {address} - No Heat",
    "HVAC: {address} - Furnace Not Igniting",
    "A/C Repair: {address} - Unit Not Cooling",
    "HVAC Service: {address} - Annual Inspection",
  ],
  General: [
    "Full Turnover: {address}",
    "Work Order: {address} - Multiple Repairs",
    "Maintenance: {address} - Punch List Items",
    "General Repair: {address} - Door & Cabinet",
  ],
  Cleaning: [
    "Deep Clean: {address} - Move-Out",
    "Cleaning: {address} - Pre-Move-In",
    "Work Order: {address} - Carpet & Oven Clean",
  ],
  Carpentry: [
    "Carpentry: {address} - Cabinet Repair",
    "Work Order: {address} - Door Adjustment",
    "Trim Work: {address} - Baseboard Replacement",
  ],
  Flooring: [
    "Flooring: {address} - LVP Install",
    "Work Order: {address} - Carpet Replacement",
    "Flooring Repair: {address} - Damaged Sections",
  ],
};

const EMAIL_BODIES_BY_TRADE: Record<string, string[]> = {
  Painting: [
    `Hi Frank,\n\nUnit needs repainting — walls and ceilings throughout. Currently has scuff marks and nail holes that need patching first.\n\nStandard white throughout. Trim needs a fresh coat too.\n\nPlease provide a quote when you can.\n\nThanks`,
    `Frank,\n\nKitchen and living room need painting. Kitchen walls currently yellow, needs "Agreeable Gray" (SW 7029). Living room has a water stain on ceiling — please assess if drywall repair needed.\n\nUnit is vacant, schedule at your convenience.\n\nThanks`,
  ],
  Electrical: [
    `Hey Frank,\n\nGot a few electrical items:\n\n1. Kitchen outlet near sink not working — may need GFCI replacement\n2. Two bedroom outlets have cracked faceplates — need replacing\n3. Bathroom exhaust fan making loud grinding noise\n\nDue by end of next week.\n\nThanks`,
    `Frank,\n\nThis is urgent — tenant has no power in the bathroom and kitchen. Breaker keeps tripping. Need someone out ASAP.\n\nThanks`,
  ],
  Plumbing: [
    `Hi Frank,\n\nKitchen faucet is dripping constantly. Bathroom toilet runs intermittently. Both need repair.\n\nTenant is home, coordinate access.\n\nThanks`,
    `Frank,\n\nURGENT — toilet overflow in unit. Tenant shut off water valve but floor is wet. Need someone today.\n\nThanks`,
  ],
  HVAC: [
    `Frank,\n\nThis is urgent — tenant has no heat. Furnace is making a clicking noise but not igniting. Thermostat shows it's calling for heat but nothing happens.\n\nPlease get someone out there today if possible. This is a rush job.\n\nThanks`,
    `Hi Frank,\n\nA/C unit not cooling properly. Tenant says it runs but blows warm air. Probably needs a recharge or compressor check.\n\nNo rush, but would like it done this week.\n\nThanks`,
  ],
  General: [
    `Hi Frank,\n\nFull unit turnover needed:\n\nPAINTING: All rooms fresh paint, standard white\nREPAIRS: Patch holes in living room, fix cabinet door, bathroom door adjustment\nCLEANING: Deep clean carpets, oven and range hood\nPLUMBING: Kitchen faucet drip, toilet running\n\nNew tenant moves in soon, need everything done quickly.\n\nPlease send a quote covering everything.\n\nThanks`,
    `Frank,\n\nSeveral maintenance items:\n1. Kitchen cabinet door hanging off hinge\n2. Bedroom door doesn't close properly\n3. Living room baseboard coming loose\n4. Closet rod needs replacing\n\nPlease send quote.\n\nThanks`,
  ],
  Cleaning: [
    `Hi Frank,\n\nNeed a deep clean of the unit — previous tenant left it in rough shape.\n\nCarpets need shampooing, oven needs degreasing, bathrooms need full scrub.\n\nThanks`,
  ],
  Carpentry: [
    `Frank,\n\nKitchen cabinets need attention — two doors hanging off hinges, one drawer track broken. Bathroom door doesn't latch.\n\nThanks`,
  ],
  Flooring: [
    `Hi Frank,\n\nLiving room and hallway need new LVP flooring. Current carpet is stained beyond cleaning. Approx 400 sqft.\n\nPlease quote.\n\nThanks`,
  ],
};

// ─── MAIN SEED FUNCTION ─────────────────────────────────────────────────────

async function seed() {
  console.log("🌱 UAT SEED — Starting...\n");

  // ── Get Organization ───────────────────────────────────────────────────
  const { data: orgs, error: orgErr } = await supabase
    .from("organizations")
    .select("id, name")
    .limit(1);
  if (orgErr || !orgs?.length) {
    console.error("No organization found:", orgErr);
    process.exit(1);
  }
  const orgId = orgs[0].id;
  console.log(`📍 Organization: ${orgs[0].name} (${orgId})`);

  // ── Get Tax Categories ─────────────────────────────────────────────────
  const { data: taxCats } = await supabase
    .from("tax_categories")
    .select("id, name");
  const catMap = new Map<string, string>();
  taxCats?.forEach((c) => catMap.set(c.name, c.id));

  // ── Get existing user for uploaded_by fields ──────────────────────────
  const { data: users } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("organization_id", orgId)
    .limit(1);
  const userId = users?.[0]?.id || null;

  // ══════════════════════════════════════════════════════════════════════
  // TIER 1: CLIENTS
  // ══════════════════════════════════════════════════════════════════════
  console.log("\n── Tier 1: Clients ──");

  const clientRecords = [
    // B2B — All Professional Trades (primary)
    {
      name: "All Professional Trades Inc.",
      email: "info@allprofessionaltrades.com",
      phone: "973-555-0100",
      address: randomAddress(),
      notes: `${SEED_TAG} — Primary B2B client. Property management company. Dispatchers: Neil, Coady, Meryl, Cole.`,
    },
    // Residential clients
    {
      name: "James & Patricia Morrison",
      email: "morrison.jp@gmail.com",
      phone: "973-555-0201",
      address: randomAddress(),
      notes: `${SEED_TAG}`,
    },
    {
      name: "Robert Chen",
      email: "rchen88@gmail.com",
      phone: "973-555-0202",
      address: randomAddress(),
      notes: `${SEED_TAG}`,
    },
    {
      name: "Maria Santos",
      email: "maria.santos@outlook.com",
      phone: "201-555-0301",
      address: randomAddress(),
      notes: `${SEED_TAG}`,
    },
    {
      name: "David & Karen O'Brien",
      email: "obrienfamily@gmail.com",
      phone: "201-555-0302",
      address: randomAddress(),
      notes: `${SEED_TAG}`,
    },
    {
      name: "Thomas Williams",
      email: "twill.contractor@gmail.com",
      phone: "908-555-0401",
      address: randomAddress(),
      notes: `${SEED_TAG}`,
    },
    {
      name: "Susan Park",
      email: "spark.designs@gmail.com",
      phone: "908-555-0402",
      address: randomAddress(),
      notes: `${SEED_TAG}`,
    },
    // Property management companies
    {
      name: "Garden State Property Management",
      email: "dispatch@gsproperty.com",
      phone: "973-555-0501",
      address: randomAddress(),
      notes: `${SEED_TAG} — Manages 3 apartment complexes`,
    },
    {
      name: "Metro Realty Group",
      email: "maintenance@metrorealty.com",
      phone: "201-555-0601",
      address: randomAddress(),
      notes: `${SEED_TAG} — Commercial & residential`,
    },
    {
      name: "Horizon Living",
      email: "workorders@horizonliving.com",
      phone: "908-555-0701",
      address: randomAddress(),
      notes: `${SEED_TAG} — Senior living communities`,
    },
    // More residential
    {
      name: "Angela Rivera",
      email: "arivera.home@gmail.com",
      phone: "973-555-0801",
      address: randomAddress(),
      notes: `${SEED_TAG}`,
    },
    {
      name: "Michael & Lisa Thompson",
      email: "thompson.ml@yahoo.com",
      phone: "201-555-0802",
      address: randomAddress(),
      notes: `${SEED_TAG}`,
    },
    {
      name: "Richard Kowalski",
      email: "rkowalski@gmail.com",
      phone: "908-555-0803",
      address: randomAddress(),
      notes: `${SEED_TAG}`,
    },
    {
      name: "Jennifer & Mark Bailey",
      email: "baileyhome@gmail.com",
      phone: "973-555-0804",
      address: randomAddress(),
      notes: `${SEED_TAG}`,
    },
    {
      name: "Paul Nguyen",
      email: "pauln.property@gmail.com",
      phone: "201-555-0805",
      address: randomAddress(),
      notes: `${SEED_TAG}`,
    },
    {
      name: "Catherine Walsh",
      email: "cwalsh.remodel@gmail.com",
      phone: "908-555-0806",
      address: randomAddress(),
      notes: `${SEED_TAG}`,
    },
    {
      name: "Ahmed Hassan",
      email: "ahassan.build@outlook.com",
      phone: "973-555-0807",
      address: randomAddress(),
      notes: `${SEED_TAG}`,
    },
    {
      name: "Donna & Frank Esposito",
      email: "esposito.df@gmail.com",
      phone: "201-555-0808",
      address: randomAddress(),
      notes: `${SEED_TAG}`,
    },
    {
      name: "Steven Kim",
      email: "stevekim.nj@gmail.com",
      phone: "908-555-0809",
      address: randomAddress(),
      notes: `${SEED_TAG}`,
    },
    {
      name: "Barbara Mitchell",
      email: "bmitchell.home@gmail.com",
      phone: "973-555-0810",
      address: randomAddress(),
      notes: `${SEED_TAG}`,
    },
    // Recurring commercial
    {
      name: "Newark Community Church",
      email: "facilities@newarkcc.org",
      phone: "973-555-0901",
      address: randomAddress(),
      notes: `${SEED_TAG} — Recurring monthly maintenance`,
    },
    {
      name: "Sunrise Daycare Center",
      email: "admin@sunrisedaycare.com",
      phone: "201-555-0902",
      address: randomAddress(),
      notes: `${SEED_TAG} — Quarterly maintenance contract`,
    },
    {
      name: "Tony's Pizzeria",
      email: "tony@tonyspizza.com",
      phone: "908-555-0903",
      address: randomAddress(),
      notes: `${SEED_TAG} — Restaurant maintenance`,
    },
    {
      name: "Liberty Insurance Office",
      email: "office@libertyins.com",
      phone: "973-555-0904",
      address: randomAddress(),
      notes: `${SEED_TAG} — Office maintenance`,
    },
    {
      name: "Dr. Patel Medical Practice",
      email: "facilities@drpatel.com",
      phone: "201-555-0905",
      address: randomAddress(),
      notes: `${SEED_TAG} — Medical office upkeep`,
    },
  ];

  const clientIds: string[] = [];
  for (const c of clientRecords) {
    const { data, error } = await supabase
      .from("clients")
      .insert({ ...c, organization_id: orgId })
      .select("id")
      .single();
    if (error) {
      console.error(`  ✗ Client "${c.name}":`, error.message);
    } else {
      clientIds.push(data.id);
    }
  }
  console.log(`  ✓ ${clientIds.length} clients inserted`);

  // ══════════════════════════════════════════════════════════════════════
  // TIER 1: SUBCONTRACTORS
  // ══════════════════════════════════════════════════════════════════════
  console.log("\n── Tier 1: Subcontractors ──");

  const subRecords = [
    {
      name: "Mike DeLuca",
      email: "mike.deluca@gmail.com",
      phone: "973-555-1001",
      trade: "Painting",
      status: "active",
    },
    {
      name: "Dave Kowalski",
      email: "davethepainter@gmail.com",
      phone: "973-555-1002",
      trade: "Painting",
      status: "active",
    },
    {
      name: "Carlos Ramirez",
      email: "carlos.r.electric@gmail.com",
      phone: "201-555-1003",
      trade: "Electrical",
      status: "active",
    },
    {
      name: "Jimmy Falcone",
      email: "jfalcone.electric@gmail.com",
      phone: "908-555-1004",
      trade: "Electrical",
      status: "active",
    },
    {
      name: "Tom O'Malley",
      email: "tom.plumbing@gmail.com",
      phone: "973-555-1005",
      trade: "Plumbing",
      status: "active",
    },
    {
      name: "Ray Patel",
      email: "raypatel.plumb@gmail.com",
      phone: "201-555-1006",
      trade: "Plumbing",
      status: "active",
    },
    {
      name: "Steve Nowak",
      email: "snowak.hvac@gmail.com",
      phone: "908-555-1007",
      trade: "HVAC",
      status: "active",
    },
    {
      name: "Eddie Torres",
      email: "etorres.hvac@gmail.com",
      phone: "973-555-1008",
      trade: "HVAC",
      status: "inactive",
    },
    {
      name: "Maria's Cleaning Co",
      email: "maria.cleaning@gmail.com",
      phone: "201-555-1009",
      trade: "Cleaning",
      status: "active",
    },
    {
      name: "Sparkle Clean NJ",
      email: "info@sparklecleannj.com",
      phone: "908-555-1010",
      trade: "Cleaning",
      status: "active",
    },
    {
      name: "Frank Jr. Aguirre",
      email: "frankjr.builds@gmail.com",
      phone: "973-555-1011",
      trade: "General",
      status: "active",
    },
    {
      name: "Pete Santoro",
      email: "pete.carpentry@gmail.com",
      phone: "201-555-1012",
      trade: "Carpentry",
      status: "active",
    },
    {
      name: "Brian Kim",
      email: "bkim.flooring@gmail.com",
      phone: "908-555-1013",
      trade: "Flooring",
      status: "active",
    },
    {
      name: "Al's Drywall",
      email: "al.drywall@gmail.com",
      phone: "973-555-1014",
      trade: "General",
      status: "active",
    },
    {
      name: "Victor Mendez",
      email: "vmendez.builds@gmail.com",
      phone: "201-555-1015",
      trade: "General",
      status: "inactive",
    },
  ];

  const subIds: string[] = [];
  for (const s of subRecords) {
    const { data, error } = await supabase
      .from("subcontractors")
      .insert({
        ...s,
        organization_id: orgId,
        communication_preference: "email",
        address: randomAddress(),
      })
      .select("id")
      .single();
    if (error) {
      console.error(`  ✗ Sub "${s.name}":`, error.message);
    } else {
      subIds.push(data.id);
    }
  }
  console.log(`  ✓ ${subIds.length} subcontractors inserted`);

  // ══════════════════════════════════════════════════════════════════════
  // TIER 1: CONTACTS
  // ══════════════════════════════════════════════════════════════════════
  console.log("\n── Tier 1: Contacts ──");

  const contactRecords = [
    {
      name: "Neil Henderson",
      email: "neilh@allprofessionaltrades.com",
      role: "dispatcher",
      company: "All Professional Trades Inc.",
    },
    {
      name: "Coady Gallant",
      email: "coady@allprofessionaltrades.com",
      role: "billing",
      company: "All Professional Trades Inc.",
    },
    {
      name: "Meryl Thompson",
      email: "meryl@allprofessionaltrades.com",
      role: "dispatcher",
      company: "All Professional Trades Inc.",
    },
    {
      name: "Cole Mitchell",
      email: "cole@allprofessionaltrades.com",
      role: "dispatcher",
      company: "All Professional Trades Inc.",
    },
    {
      name: "Sandra Reyes",
      email: "dispatch@gsproperty.com",
      role: "dispatcher",
      company: "Garden State Property Management",
    },
    {
      name: "Kevin Brooks",
      email: "maintenance@metrorealty.com",
      role: "dispatcher",
      company: "Metro Realty Group",
    },
    {
      name: "Nancy Chen",
      email: "workorders@horizonliving.com",
      role: "dispatcher",
      company: "Horizon Living",
    },
    {
      name: "Frank Aguirre",
      email: "aguirref04@gmail.com",
      role: "client",
      company: "Frank's Home Improvement",
    },
  ];

  // Use upsert to avoid conflict with existing seed contacts
  const { error: contactErr } = await supabase
    .from("contacts")
    .upsert(contactRecords, { onConflict: "email" });
  if (contactErr) console.error("  ✗ Contacts:", contactErr.message);
  else console.log(`  ✓ ${contactRecords.length} contacts upserted`);

  // ══════════════════════════════════════════════════════════════════════
  // TIER 1: SAVED RATES (Catalog)
  // ══════════════════════════════════════════════════════════════════════
  console.log("\n── Tier 1: Saved Rates ──");

  const rateRecords = CATALOG_ITEMS.map((item) => ({
    organization_id: orgId,
    task_name: item.task_name,
    unit_price: item.unit_price,
  }));

  const { error: rateErr } = await supabase
    .from("saved_rates")
    .upsert(rateRecords, { onConflict: "organization_id,task_name" });
  if (rateErr) console.error("  ✗ Saved Rates:", rateErr.message);
  else console.log(`  ✓ ${rateRecords.length} saved rates upserted`);

  // ══════════════════════════════════════════════════════════════════════
  // TIER 2: PROPERTIES, BUILDINGS, UNITS
  // ══════════════════════════════════════════════════════════════════════
  console.log("\n── Tier 2: Properties / Buildings / Units ──");

  const propertyDefs = [
    {
      name: "Oakwood Gardens",
      address: "42 Oakwood Drive, Newark, NJ 07102",
      buildings: [
        { name: "Building A", code: "OG-A", floors: 4, units: 8 },
        { name: "Building B", code: "OG-B", floors: 3, units: 6 },
        { name: "Building C", code: "OG-C", floors: 4, units: 8 },
      ],
    },
    {
      name: "Maple Avenue Apartments",
      address: "123 Maple Avenue, Elizabeth, NJ 07201",
      buildings: [
        { name: "North Wing", code: "MA-N", floors: 3, units: 6 },
        { name: "South Wing", code: "MA-S", floors: 3, units: 6 },
      ],
    },
    {
      name: "Pine Street Commons",
      address: "18 Pine Street, Paterson, NJ 07501",
      buildings: [
        { name: "Building 1", code: "PS-1", floors: 4, units: 8 },
        { name: "Building 2", code: "PS-2", floors: 4, units: 8 },
      ],
    },
    {
      name: "Elm Court Residences",
      address: "7 Elm Court, Jersey City, NJ 07302",
      buildings: [
        { name: "Main Building", code: "EC-M", floors: 5, units: 10 },
      ],
    },
    {
      name: "Birch Lane Townhomes",
      address: "55 Birch Lane, Clifton, NJ 07011",
      buildings: [
        { name: "Block 1", code: "BL-1", floors: 2, units: 4 },
        { name: "Block 2", code: "BL-2", floors: 2, units: 4 },
        { name: "Block 3", code: "BL-3", floors: 2, units: 4 },
      ],
    },
    {
      name: "Cedar Heights",
      address: "200 Cedar Road, Trenton, NJ 08608",
      buildings: [
        { name: "Tower A", code: "CH-A", floors: 6, units: 12 },
        { name: "Tower B", code: "CH-B", floors: 6, units: 12 },
      ],
    },
    {
      name: "Walnut Creek Village",
      address: "85 Walnut Drive, New Brunswick, NJ 08901",
      buildings: [
        { name: "Village East", code: "WC-E", floors: 3, units: 6 },
        { name: "Village West", code: "WC-W", floors: 3, units: 6 },
      ],
    },
    {
      name: "Spruce Meadows Senior Living",
      address: "300 Spruce Way, Hoboken, NJ 07030",
      buildings: [
        { name: "Residence Hall", code: "SM-R", floors: 4, units: 8 },
        { name: "Assisted Living", code: "SM-A", floors: 3, units: 6 },
      ],
    },
  ];

  // Assign properties to clients (APT gets most, property mgmt gets rest)
  const aptClientId = clientIds[0]; // All Professional Trades
  const gsClientId = clientIds[7]; // Garden State
  const metroClientId = clientIds[8]; // Metro Realty
  const horizonClientId = clientIds[9]; // Horizon Living

  const propertyClientMap = [
    aptClientId,
    aptClientId,
    aptClientId,
    aptClientId,
    gsClientId,
    metroClientId,
    gsClientId,
    horizonClientId,
  ];

  const propertyIds: string[] = [];
  const buildingIds: string[] = [];
  const unitRecordsAll: Array<{
    id: string;
    building_id: string;
    property_idx: number;
    unit_number: string;
    status: string;
  }> = [];

  for (let pi = 0; pi < propertyDefs.length; pi++) {
    const prop = propertyDefs[pi];
    const { data: propData, error: propErr } = await supabase
      .from("properties")
      .insert({
        organization_id: orgId,
        client_id: propertyClientMap[pi],
        name: prop.name,
        address: prop.address,
        is_active: true,
        notes: SEED_TAG,
      })
      .select("id")
      .single();

    if (propErr) {
      console.error(`  ✗ Property "${prop.name}":`, propErr.message);
      continue;
    }
    propertyIds.push(propData.id);

    for (const bldg of prop.buildings) {
      const { data: bldgData, error: bldgErr } = await supabase
        .from("buildings")
        .insert({
          property_id: propData.id,
          organization_id: orgId,
          name: bldg.name,
          code: bldg.code,
          floor_count: bldg.floors,
        })
        .select("id")
        .single();

      if (bldgErr) {
        console.error(`  ✗ Building "${bldg.name}":`, bldgErr.message);
        continue;
      }
      buildingIds.push(bldgData.id);

      // Create units
      const unitStatuses = [
        "occupied",
        "occupied",
        "occupied",
        "occupied",
        "occupied",
        "occupied",
        "vacant",
        "turnover",
        "ready",
        "offline",
      ];
      for (let u = 0; u < bldg.units; u++) {
        const floor = Math.floor(u / (bldg.units / bldg.floors)) + 1;
        const unitNum = `${floor}${String((u % Math.ceil(bldg.units / bldg.floors)) + 1).padStart(2, "0")}`;
        const status = unitStatuses[u % unitStatuses.length];

        const { data: unitData, error: unitErr } = await supabase
          .from("units")
          .insert({
            building_id: bldgData.id,
            organization_id: orgId,
            unit_number: unitNum,
            floor,
            bedrooms: pick([1, 1, 2, 2, 2, 3]),
            bathrooms: pick([1, 1, 1, 2]),
            sqft: pick([650, 750, 850, 950, 1100, 1250]),
            status,
          })
          .select("id")
          .single();

        if (!unitErr && unitData) {
          unitRecordsAll.push({
            id: unitData.id,
            building_id: bldgData.id,
            property_idx: pi,
            unit_number: unitNum,
            status,
          });
        }
      }
    }
  }
  console.log(
    `  ✓ ${propertyIds.length} properties, ${buildingIds.length} buildings, ${unitRecordsAll.length} units`,
  );

  // ══════════════════════════════════════════════════════════════════════
  // TIER 1: EMAIL SENDER RULES
  // ══════════════════════════════════════════════════════════════════════
  console.log("\n── Tier 1: Email Sender Rules ──");

  const senderRules = [
    {
      organization_id: orgId,
      email_pattern: "*@allprofessionaltrades.com",
      classification: "new_work",
      sender_name: "All Professional Trades",
    },
    {
      organization_id: orgId,
      email_pattern: "dispatch@gsproperty.com",
      classification: "new_work",
      sender_name: "Garden State PM",
    },
    {
      organization_id: orgId,
      email_pattern: "maintenance@metrorealty.com",
      classification: "new_work",
      sender_name: "Metro Realty",
    },
    {
      organization_id: orgId,
      email_pattern: "workorders@horizonliving.com",
      classification: "new_work",
      sender_name: "Horizon Living",
    },
  ];

  const { error: senderErr } = await supabase
    .from("email_sender_rules")
    .insert(senderRules);
  if (senderErr) console.error("  ✗ Sender rules:", senderErr.message);
  else console.log(`  ✓ ${senderRules.length} email sender rules`);

  // ══════════════════════════════════════════════════════════════════════
  // TIER 1: FINANCE RULES
  // ══════════════════════════════════════════════════════════════════════
  console.log("\n── Tier 1: Finance Rules ──");

  const financeRuleDefs = [
    { pattern: "HOME DEPOT", match: "CONTAINS", cat: "Materials" },
    { pattern: "LOWES", match: "CONTAINS", cat: "Materials" },
    { pattern: "SHERWIN WILLIAMS", match: "CONTAINS", cat: "Materials" },
    { pattern: "HOME HARDWARE", match: "CONTAINS", cat: "Materials" },
    { pattern: "SHELL", match: "STARTS_WITH", cat: "Vehicle Expenses" },
    { pattern: "PETRO CANADA", match: "CONTAINS", cat: "Vehicle Expenses" },
    { pattern: "TIM HORTONS", match: "CONTAINS", cat: "Meals & Entertainment" },
    { pattern: "AMAZON", match: "CONTAINS", cat: "Office Supplies" },
    {
      pattern: "FACEBOOK ADS",
      match: "CONTAINS",
      cat: "Advertising & Marketing",
    },
    {
      pattern: "GOOGLE WORKSPACE",
      match: "CONTAINS",
      cat: "Software & Subscriptions",
    },
    { pattern: "ADOBE", match: "CONTAINS", cat: "Software & Subscriptions" },
    { pattern: "U-HAUL", match: "CONTAINS", cat: "Equipment Rental" },
  ];

  for (let i = 0; i < financeRuleDefs.length; i++) {
    const r = financeRuleDefs[i];
    const catId = catMap.get(r.cat);
    if (!catId) continue;
    await supabase.from("finance_rules").insert({
      organization_id: orgId,
      param_pattern: r.pattern,
      match_type: r.match,
      action_category_id: catId,
      is_active: true,
      priority: i + 1,
    });
  }
  console.log(`  ✓ ${financeRuleDefs.length} finance rules`);

  // ══════════════════════════════════════════════════════════════════════
  // TIER 3: JOBS (the big one)
  // ══════════════════════════════════════════════════════════════════════
  console.log("\n── Tier 3: Jobs ──");

  const START_DATE = new Date("2024-03-01");
  const NOW = new Date("2026-03-16");
  const activeSubs = subIds.filter((_, i) => subRecords[i].status === "active");

  // Job distribution plan
  interface JobPlan {
    status: string;
    count: number;
    dateRange: [Date, Date];
    invoiceAmount?: [number, number]; // min, max
  }

  const jobPlans: JobPlan[] = [
    {
      status: "paid",
      count: 300,
      dateRange: [START_DATE, new Date("2026-02-28")],
      invoiceAmount: [800, 15000],
    },
    {
      status: "invoiced",
      count: 5,
      dateRange: [new Date("2025-12-01"), new Date("2026-03-10")],
      invoiceAmount: [1200, 8000],
    },
    {
      status: "completed",
      count: 3,
      dateRange: [new Date("2026-03-08"), new Date("2026-03-14")],
    },
    {
      status: "in_progress",
      count: 4,
      dateRange: [new Date("2026-03-12"), new Date("2026-03-16")],
    },
    {
      status: "scheduled",
      count: 8,
      dateRange: [new Date("2026-03-17"), new Date("2026-03-31")],
    },
    {
      status: "approved",
      count: 6,
      dateRange: [new Date("2026-03-10"), new Date("2026-03-15")],
    },
    {
      status: "sent",
      count: 3,
      dateRange: [new Date("2026-02-10"), new Date("2026-03-14")],
    },
    {
      status: "quoted",
      count: 4,
      dateRange: [new Date("2026-03-12"), new Date("2026-03-15")],
    },
    {
      status: "draft",
      count: 5,
      dateRange: [new Date("2026-03-13"), new Date("2026-03-16")],
    },
    {
      status: "incoming",
      count: 3,
      dateRange: [new Date("2026-03-15"), new Date("2026-03-16")],
    },
    {
      status: "cancelled",
      count: 3,
      dateRange: [new Date("2024-06-01"), new Date("2026-01-15")],
    },
  ];

  let jobCounter = 0;
  let photoSeed = 1;
  const allJobIds: Array<{
    id: string;
    status: string;
    clientId: string;
    amount: number;
    createdAt: Date;
    jobNumber: string;
  }> = [];

  for (const plan of jobPlans) {
    for (let j = 0; j < plan.count; j++) {
      jobCounter++;
      const createdAt = randomDate(plan.dateRange[0], plan.dateRange[1]);
      const trade = pick(TRADES);
      const clientId = pick(clientIds);
      const clientIdx = clientIds.indexOf(clientId);
      const address = randomAddress();
      const dispatcher = pick(DISPATCHERS);
      const subjectTemplates =
        EMAIL_SUBJECTS_BY_TRADE[trade] || EMAIL_SUBJECTS_BY_TRADE["General"];
      const bodyTemplates =
        EMAIL_BODIES_BY_TRADE[trade] || EMAIL_BODIES_BY_TRADE["General"];
      const subject = pick(subjectTemplates).replace(
        "{address}",
        address.split(",")[0],
      );
      const body = pick(bodyTemplates);
      const urgency = subject.includes("URGENT") ? "rush" : "standard";

      // Build job number manually to control sequencing
      const year = createdAt.getFullYear();
      const jobNumber = `FHI-${year}-${String(jobCounter).padStart(3, "0")}`;

      // Calculate amounts
      const taskCount = randomInt(2, 6);
      const tasks = pickN(CATALOG_ITEMS, taskCount);
      const lineTotal = tasks.reduce(
        (sum, t) =>
          sum +
          t.unit_price *
            (t.item_type === "material" ? randomInt(1, 5) : randomInt(1, 3)),
        0,
      );
      const invoiceAmount = plan.invoiceAmount
        ? randomAmount(plan.invoiceAmount[0], plan.invoiceAmount[1])
        : lineTotal;

      // Determine date milestones based on status
      const quoteSentAt =
        plan.status !== "incoming" && plan.status !== "draft"
          ? new Date(createdAt.getTime() + randomInt(1, 3) * 86400000)
          : null;
      const approvedAt = [
        "approved",
        "scheduled",
        "in_progress",
        "completed",
        "invoiced",
        "paid",
      ].includes(plan.status)
        ? new Date(
            (quoteSentAt || createdAt).getTime() + randomInt(1, 5) * 86400000,
          )
        : null;
      const scheduledStart = [
        "scheduled",
        "in_progress",
        "completed",
        "invoiced",
        "paid",
      ].includes(plan.status)
        ? new Date(
            (approvedAt || createdAt).getTime() + randomInt(2, 14) * 86400000,
          )
        : null;
      const completedAt = ["completed", "invoiced", "paid"].includes(
        plan.status,
      )
        ? new Date(
            (scheduledStart || createdAt).getTime() +
              randomInt(1, 5) * 86400000,
          )
        : null;
      const invoicedAt = ["invoiced", "paid"].includes(plan.status)
        ? new Date(
            (completedAt || createdAt).getTime() + randomInt(0, 2) * 86400000,
          )
        : null;
      const paidAt =
        plan.status === "paid"
          ? new Date(
              (invoicedAt || createdAt).getTime() + randomInt(1, 45) * 86400000,
            )
          : null;

      // Due date
      const dueDate = scheduledStart
        ? formatDate(
            new Date(scheduledStart.getTime() + randomInt(0, 7) * 86400000),
          )
        : urgency === "rush"
          ? formatDate(new Date(createdAt.getTime() + 2 * 86400000))
          : null;

      const jobTitle = `${trade} — ${address.split(",")[0]}`;

      const { data: jobData, error: jobErr } = await supabase
        .from("jobs")
        .insert({
          organization_id: orgId,
          client_id: clientId,
          title: jobTitle,
          description: body,
          status: plan.status,
          job_number: jobNumber,
          property_address: address,
          urgency,
          due_date: dueDate,
          requester_name: dispatcher.name,
          requester_email: dispatcher.email,
          source_email_subject: subject,
          source_email_body: `From: ${dispatcher.name} <${dispatcher.email}>\nSubject: ${subject}\n\n${body}`,
          start_date: scheduledStart ? formatDate(scheduledStart) : null,
          end_date: completedAt ? formatDate(completedAt) : null,
          created_at: formatTimestamp(createdAt),
          property_id: propertyIds.length > 0 ? pick(propertyIds) : null,
        })
        .select("id, job_number")
        .single();

      if (jobErr) {
        // Job number conflict — skip
        if (jobErr.code === "23505") continue;
        console.error(`  ✗ Job ${jobNumber}:`, jobErr.message);
        continue;
      }

      allJobIds.push({
        id: jobData.id,
        status: plan.status,
        clientId,
        amount: invoiceAmount,
        createdAt,
        jobNumber: jobData.job_number || jobNumber,
      });

      // ── Job Tasks ──────────────────────────────────────────────────
      const taskInserts = tasks.map((t, ti) => ({
        job_id: jobData.id,
        description: t.task_name,
        quantity:
          t.item_type === "material" ? randomInt(1, 5) : randomInt(1, 3),
        unit_price: t.unit_price,
        is_confirmed: plan.status !== "incoming" && plan.status !== "draft",
      }));
      await supabase.from("job_tasks").insert(taskInserts);

      // ── Job Events (timeline) ──────────────────────────────────────
      const events: Array<{
        job_id: string;
        event_type: string;
        metadata: any;
        created_at: string;
      }> = [];
      events.push({
        job_id: jobData.id,
        event_type: "created",
        metadata: { source: "email", dispatcher: dispatcher.name },
        created_at: formatTimestamp(createdAt),
      });

      if (quoteSentAt) {
        events.push({
          job_id: jobData.id,
          event_type: "email_sent",
          metadata: { to: dispatcher.email, type: "quote" },
          created_at: formatTimestamp(quoteSentAt),
        });
        if (seededRandom() > 0.3) {
          events.push({
            job_id: jobData.id,
            event_type: "viewed",
            metadata: { by: dispatcher.email },
            created_at: formatTimestamp(
              new Date(quoteSentAt.getTime() + randomInt(1, 48) * 3600000),
            ),
          });
        }
      }
      if (approvedAt) {
        events.push({
          job_id: jobData.id,
          event_type: "approved",
          metadata: { by: dispatcher.name },
          created_at: formatTimestamp(approvedAt),
        });
      }
      if (plan.status === "cancelled") {
        events.push({
          job_id: jobData.id,
          event_type: "status_change",
          metadata: {
            from: "draft",
            to: "cancelled",
            reason: pick([
              "Client cancelled",
              "Scope changed",
              "Budget issue",
              "Duplicate request",
            ]),
          },
          created_at: formatTimestamp(
            new Date(createdAt.getTime() + randomInt(1, 14) * 86400000),
          ),
        });
      }
      if (completedAt) {
        events.push({
          job_id: jobData.id,
          event_type: "status_change",
          metadata: { from: "in_progress", to: "completed" },
          created_at: formatTimestamp(completedAt),
        });
      }
      if (paidAt) {
        events.push({
          job_id: jobData.id,
          event_type: "status_change",
          metadata: { from: "invoiced", to: "paid" },
          created_at: formatTimestamp(paidAt),
        });
      }

      if (events.length > 0) {
        await supabase.from("job_events").insert(events);
      }

      // ── Job Assignments (for scheduled+) ───────────────────────────
      if (
        ["scheduled", "in_progress", "completed", "invoiced", "paid"].includes(
          plan.status,
        ) &&
        activeSubs.length > 0
      ) {
        const assignedSubs = pickN(activeSubs, randomInt(1, 2));
        for (const subId of assignedSubs) {
          await supabase.from("job_assignments").insert({
            job_id: jobData.id,
            subcontractor_id: subId,
            status:
              plan.status === "scheduled"
                ? "assigned"
                : plan.status === "in_progress"
                  ? "active"
                  : "completed",
          });
        }
      }

      // ── Job Photos (for in_progress+) ──────────────────────────────
      if (
        ["in_progress", "completed", "invoiced", "paid"].includes(plan.status)
      ) {
        const photoCount =
          plan.status === "in_progress" ? randomInt(1, 3) : randomInt(3, 6);
        const photoLabels =
          plan.status === "in_progress"
            ? ["before", "other"]
            : ["before", "before", "after", "after", "completion", "other"];

        for (let p = 0; p < photoCount; p++) {
          photoSeed++;
          const label = pick(photoLabels);
          await supabase.from("job_photos").insert({
            job_id: jobData.id,
            url: stockPhotoUrl(photoSeed),
            caption: `${label} photo — ${jobTitle}`,
            uploaded_by: userId,
            created_at: formatTimestamp(
              new Date(
                (scheduledStart || createdAt).getTime() +
                  randomInt(0, 3) * 86400000 +
                  randomInt(0, 8) * 3600000,
              ),
            ),
          });
        }
      }

      // completion_reports and punch_list_items tables not yet created — skipped
    }

    console.log(`  ✓ ${plan.count} ${plan.status} jobs`);
  }
  console.log(`  Total: ${allJobIds.length} jobs created`);

  // ══════════════════════════════════════════════════════════════════════
  // TIER 5: TURNOVERS
  // ══════════════════════════════════════════════════════════════════════
  console.log("\n── Tier 5: Turnovers ──");

  const turnoverUnits = unitRecordsAll.filter(
    (u) =>
      u.status === "turnover" || u.status === "ready" || u.status === "vacant",
  );
  const turnoverStages = [
    "notice",
    "vacated",
    "inspection",
    "in_progress",
    "paint",
    "clean",
    "final_qc",
    "ready",
  ] as const;
  let turnoverCount = 0;

  // Historical turnovers (completed)
  for (let t = 0; t < 25; t++) {
    const unit = pick(unitRecordsAll);
    const startDate = randomDate(START_DATE, new Date("2026-02-28"));
    const { error } = await supabase.from("turnovers").insert({
      unit_id: unit.id,
      organization_id: orgId,
      move_out_date: formatDate(startDate),
      target_ready_date: formatDate(
        new Date(startDate.getTime() + 14 * 86400000),
      ),
      move_in_date: formatDate(new Date(startDate.getTime() + 21 * 86400000)),
      stage: "ready",
      estimated_cost: randomAmount(1500, 5000),
      actual_cost: randomAmount(1200, 5500),
      is_active: false,
      notes: SEED_TAG,
    });
    if (!error) turnoverCount++;
  }

  // Active turnovers at various stages
  const activeStages: Array<(typeof turnoverStages)[number]> = [
    "notice",
    "notice",
    "notice",
    "vacated",
    "inspection",
    "inspection",
    "in_progress",
    "in_progress",
    "in_progress",
    "in_progress",
    "paint",
    "paint",
    "clean",
    "final_qc",
    "final_qc",
  ];
  for (let t = 0; t < activeStages.length; t++) {
    const unit =
      turnoverUnits[t % turnoverUnits.length] || pick(unitRecordsAll);
    const startDate = randomDate(
      new Date("2026-02-15"),
      new Date("2026-03-15"),
    );
    const { data: turnData, error: turnErr } = await supabase
      .from("turnovers")
      .insert({
        unit_id: unit.id,
        organization_id: orgId,
        move_out_date: formatDate(startDate),
        target_ready_date: formatDate(
          new Date(startDate.getTime() + 14 * 86400000),
        ),
        stage: activeStages[t],
        estimated_cost: randomAmount(1500, 5000),
        actual_cost: ["in_progress", "paint", "clean", "final_qc"].includes(
          activeStages[t],
        )
          ? randomAmount(800, 3000)
          : null,
        is_active: true,
        notes: SEED_TAG,
      })
      .select("id")
      .single();

    if (!turnErr && turnData) {
      turnoverCount++;
      // Add turnover tasks
      const turnTasks = [
        {
          description: "Paint all rooms — walls & ceilings",
          trade: "Painting",
          sort_order: 1,
        },
        { description: "Patch drywall holes", trade: "General", sort_order: 2 },
        {
          description: "Replace kitchen faucet",
          trade: "Plumbing",
          sort_order: 3,
        },
        { description: "Deep clean unit", trade: "Cleaning", sort_order: 4 },
        { description: "Carpet cleaning", trade: "Cleaning", sort_order: 5 },
        {
          description: "Inspect electrical",
          trade: "Electrical",
          sort_order: 6,
        },
      ];
      const stageIdx = turnoverStages.indexOf(activeStages[t]);
      for (const tt of turnTasks) {
        const taskStatus =
          tt.sort_order <= stageIdx
            ? "completed"
            : tt.sort_order === stageIdx + 1
              ? "in_progress"
              : "pending";
        await supabase.from("turnover_tasks").insert({
          turnover_id: turnData.id,
          organization_id: orgId,
          description: tt.description,
          trade: tt.trade,
          status: taskStatus,
          estimated_cost: randomAmount(200, 800),
          actual_cost:
            taskStatus === "completed" ? randomAmount(150, 900) : null,
          completed_at:
            taskStatus === "completed"
              ? formatTimestamp(randomDate(new Date("2026-03-01"), NOW))
              : null,
          sort_order: tt.sort_order,
        });
      }
    }
  }
  console.log(`  ✓ ${turnoverCount} turnovers`);

  // ══════════════════════════════════════════════════════════════════════
  // TIER 6: FINANCE
  // ══════════════════════════════════════════════════════════════════════
  console.log("\n── Tier 6: Finance ──");

  // Financial Periods (24 months) — schema: name, start_date, end_date, is_closed
  const periods: Array<{ id: string; startDate: string }> = [];
  for (let m = 0; m < 24; m++) {
    const startD = new Date(2024, 3 + m, 1); // Start Mar 2024
    const endD = new Date(2024, 3 + m + 1, 0); // Last day of month
    const isClosed = startD < new Date("2026-01-01");
    const monthName = startD.toLocaleString("en-US", {
      month: "long",
      year: "numeric",
    });
    const { data: pData } = await supabase
      .from("financial_periods")
      .insert({
        organization_id: orgId,
        name: monthName,
        start_date: formatDate(startD),
        end_date: formatDate(endD),
        is_closed: isClosed,
      })
      .select("id")
      .single();
    if (pData) periods.push({ id: pData.id, startDate: formatDate(startD) });
  }
  console.log(`  ✓ ${periods.length} financial periods`);

  // Finance Transactions — Revenue from paid jobs
  let txnCount = 0;
  const paidJobs = allJobIds.filter((j) => j.status === "paid");
  const revenueCatId = catMap.get("Sales / Revenue");
  const subCatId = catMap.get("Subcontractors");

  for (const job of paidJobs) {
    // Revenue transaction
    const period = periods.find((p) => {
      const pMonth = new Date(p.startDate);
      return (
        pMonth.getMonth() === job.createdAt.getMonth() &&
        pMonth.getFullYear() === job.createdAt.getFullYear()
      );
    });

    await supabase.from("finance_transactions").insert({
      organization_id: orgId,
      period_id: period?.id || null,
      transaction_date: formatDate(job.createdAt),
      amount: job.amount,
      description: `Payment — ${job.jobNumber}`,
      raw_description: `E-TRANSFER ${job.jobNumber} ${job.amount}`,
      source: "seed_script",
      source_id: `${SEED_TAG}-rev-${job.id}`,
      category_id: revenueCatId || null,
      job_id: job.id,
      status: "CONFIRMED",
      confidence_score: 1.0,
    });
    txnCount++;

    // Sub expense (60-70% of revenue) — job_payouts table not yet created, record as finance txn
    if (activeSubs.length > 0) {
      const payoutAmount =
        Math.round(job.amount * (0.55 + seededRandom() * 0.15) * 100) / 100;
      const subId = pick(activeSubs);
      await supabase.from("finance_transactions").insert({
        organization_id: orgId,
        period_id: period?.id || null,
        transaction_date: formatDate(
          new Date(job.createdAt.getTime() + randomInt(7, 21) * 86400000),
        ),
        amount: -payoutAmount,
        description: `Sub Payout — ${subRecords[subIds.indexOf(subId)]?.name || "Subcontractor"}`,
        raw_description: `E-TRANSFER OUT SUB ${job.jobNumber}`,
        source: "seed_script",
        source_id: `${SEED_TAG}-sub-${job.id}`,
        category_id: subCatId || null,
        job_id: job.id,
        status: "CONFIRMED",
        confidence_score: 0.95,
      });
      txnCount++;
    }
  }

  // Expense transactions (operational costs)
  const expenseTemplates = [
    { desc: "Home Depot", cat: "Materials", range: [50, 500] },
    { desc: "Lowes", cat: "Materials", range: [30, 300] },
    { desc: "Sherwin Williams", cat: "Materials", range: [100, 1000] },
    { desc: "Shell Fuel", cat: "Vehicle Expenses", range: [40, 120] },
    { desc: "Petro Canada", cat: "Vehicle Expenses", range: [50, 100] },
    { desc: "Tim Hortons", cat: "Meals & Entertainment", range: [5, 20] },
    { desc: "Amazon Marketplace", cat: "Office Supplies", range: [20, 150] },
    {
      desc: "Google Workspace",
      cat: "Software & Subscriptions",
      range: [20, 20],
    },
    {
      desc: "Adobe Creative Cloud",
      cat: "Software & Subscriptions",
      range: [80, 80],
    },
    { desc: "Facebook Ads", cat: "Advertising & Marketing", range: [100, 500] },
    { desc: "U-Haul Rental", cat: "Equipment Rental", range: [40, 200] },
    { desc: "Insurance Premium", cat: "Insurance", range: [200, 200] },
    { desc: "Bank Fee", cat: "Bank Fees", range: [10, 30] },
    {
      desc: "Lunch - Client Meeting",
      cat: "Meals & Entertainment",
      range: [30, 80],
    },
  ];

  // ~500 operational expense transactions over 24 months
  for (let e = 0; e < 500; e++) {
    const tmpl = pick(expenseTemplates);
    const txnDate = randomDate(START_DATE, NOW);
    const period = periods.find((p) => {
      const pMonth = new Date(p.startDate);
      return (
        pMonth.getMonth() === txnDate.getMonth() &&
        pMonth.getFullYear() === txnDate.getFullYear()
      );
    });
    const catId = catMap.get(tmpl.cat);
    const isClassified = catId && seededRandom() > 0.15;

    await supabase.from("finance_transactions").insert({
      organization_id: orgId,
      period_id: period?.id || null,
      transaction_date: formatDate(txnDate),
      amount: -randomAmount(tmpl.range[0], tmpl.range[1]),
      description: tmpl.desc,
      raw_description: `${tmpl.desc.toUpperCase()} - POS ${randomInt(1000, 9999)}`,
      source: "seed_script",
      source_id: `${SEED_TAG}-exp-${uuidv4()}`,
      category_id: isClassified ? catId : null,
      status: isClassified
        ? "AUTO_CLASSIFIED"
        : seededRandom() > 0.5
          ? "INGESTED"
          : "AMBIGUOUS",
      confidence_score: isClassified
        ? randomAmount(0.7, 0.95)
        : randomAmount(0.1, 0.4),
    });
    txnCount++;
  }

  // Statement uploads
  for (let q = 0; q < 8; q++) {
    const uploadDate = new Date(2024, 3 + q * 3, randomInt(1, 5));
    await supabase.from("statement_uploads").insert({
      organization_id: orgId,
      filename: `${q < 4 ? "checking" : "visa"}_statement_${formatDate(uploadDate).slice(0, 7)}.csv`,
      upload_type: q < 4 ? "bank" : "cc",
      statement_period: formatDate(uploadDate).slice(0, 7),
      record_count: randomInt(30, 80),
      uploaded_by: userId,
    });
  }

  console.log(`  ✓ ${txnCount} finance transactions, 8 statement uploads`);

  // recurring_schedules and payment_reminders tables not yet created — skipped
  console.log(
    "\n── Skipped: recurring_schedules, payment_reminders (tables not yet created) ──",
  );

  // ══════════════════════════════════════════════════════════════════════
  // TIER 7: EMAIL SCAN LOG
  // ══════════════════════════════════════════════════════════════════════
  console.log("\n── Tier 7: Email Scan Log ──");

  let emailLogCount = 0;
  for (let e = 0; e < 150; e++) {
    const dispatcher = pick(DISPATCHERS);
    const scanDate = randomDate(START_DATE, NOW);
    const classification = pick([
      "new_work",
      "new_work",
      "new_work",
      "quote_request",
      "job_update",
      "job_update",
      "irrelevant",
    ]);
    const linkedJob =
      classification === "new_work" && allJobIds.length > 0
        ? pick(allJobIds)
        : null;

    const { error } = await supabase.from("email_scan_log").insert({
      organization_id: orgId,
      gmail_message_id: `msg-${SEED_TAG}-${uuidv4().slice(0, 8)}`,
      from_address: dispatcher.email,
      subject: `${pick(["Work Order:", "RE:", "FW:", "URGENT:", "Follow-up:"])} ${randomAddress().split(",")[0]}`,
      classification,
      job_id: linkedJob?.id || null,
      processed_at: formatTimestamp(scanDate),
    });
    if (!error) emailLogCount++;
  }
  console.log(`  ✓ ${emailLogCount} email scan logs`);

  // ══════════════════════════════════════════════════════════════════════
  // TIER 7: NOTIFICATIONS
  // ══════════════════════════════════════════════════════════════════════
  console.log("\n── Tier 7: Notifications ──");

  const notifTypes = [
    "new_job",
    "quote_stale",
    "sub_photo",
    "completion_ready",
    "margin_warning",
    "review_request",
    "email_detected",
    "schedule_suggestion",
  ];
  let notifCount = 0;

  for (let n = 0; n < 200; n++) {
    const type = pick(notifTypes);
    const createdAt = randomDate(new Date("2025-06-01"), NOW);
    const isRecent = createdAt > new Date("2026-03-10");
    const isRead = isRecent ? seededRandom() > 0.7 : seededRandom() > 0.2;
    const linkedJob = allJobIds.length > 0 ? pick(allJobIds) : null;

    const titles: Record<string, string> = {
      new_job: `New job from ${pick(DISPATCHERS).name}`,
      quote_stale: `Quote stale: ${linkedJob?.jobNumber || "FHI-2026-XXX"}`,
      sub_photo: `Photo uploaded for ${linkedJob?.jobNumber || "job"}`,
      completion_ready: `${linkedJob?.jobNumber || "Job"} ready for review`,
      margin_warning: `Low margin on ${linkedJob?.jobNumber || "job"}`,
      review_request: `Transaction needs review`,
      email_detected: `New email from ${pick(DISPATCHERS).email}`,
      schedule_suggestion: `Scheduling opportunity this week`,
    };

    const { error } = await supabase.from("notifications").insert({
      organization_id: orgId,
      user_id: userId,
      type,
      title: titles[type],
      body: `Notification details for ${type} event`,
      metadata: linkedJob
        ? { job_id: linkedJob.id, job_number: linkedJob.jobNumber }
        : {},
      is_read: isRead,
      created_at: formatTimestamp(createdAt),
      read_at: isRead
        ? formatTimestamp(
            new Date(createdAt.getTime() + randomInt(1, 48) * 3600000),
          )
        : null,
    });
    if (!error) notifCount++;
  }
  console.log(`  ✓ ${notifCount} notifications`);

  // ══════════════════════════════════════════════════════════════════════
  // TIER 7: WORK ORDER DRAFTS (pending review)
  // ══════════════════════════════════════════════════════════════════════
  console.log("\n── Tier 7: Work Order Drafts ──");

  const woDrafts = [
    {
      source: "email",
      raw_content: `From: meryl@allprofessionaltrades.com\nSubject: Bathroom Remodel 42 Oakwood Unit 305\n\nHi Frank, need bathroom remodel...`,
      extracted_data: {
        address: "42 Oakwood Drive Unit 305",
        trade: "Painting",
        urgency: "standard",
        tasks: ["Repaint walls", "Patch drywall", "Replace vanity"],
      },
      status: "needs_review",
    },
    {
      source: "voice",
      raw_content:
        "Voicemail from Neil Henderson: Hey Frank, got an emergency at Pine Street, unit 102. No heat. Need someone ASAP.",
      extracted_data: {
        address: "18 Pine Street Unit 102",
        trade: "HVAC",
        urgency: "rush",
        tasks: ["Furnace repair", "Thermostat check"],
      },
      status: "needs_review",
    },
    {
      source: "email",
      raw_content: `From: cole@allprofessionaltrades.com\nSubject: Electrical 55 Birch Lane 404\n\nFew electrical items...`,
      extracted_data: {
        address: "55 Birch Lane Unit 404",
        trade: "Electrical",
        urgency: "standard",
        tasks: ["GFCI replacement", "Outlet replacement", "Exhaust fan"],
      },
      status: "needs_review",
    },
  ];

  for (const wo of woDrafts) {
    await supabase.from("work_order_drafts").insert({
      organization_id: orgId,
      source: wo.source,
      raw_content: wo.raw_content,
      extracted_data: wo.extracted_data,
      status: wo.status,
    });
  }
  console.log(`  ✓ ${woDrafts.length} work order drafts`);

  // ══════════════════════════════════════════════════════════════════════
  // TIER 8: OUTCOME ENGINE
  // ══════════════════════════════════════════════════════════════════════
  console.log("\n── Tier 8: Outcome Engine ──");

  // Engagement 1: Frank's own business optimization
  const { data: eng1 } = await supabase
    .from("engagements")
    .insert({
      organization_id: orgId,
      client_name: "Frank's Home Improvement",
      client_contact_name: "Frank Aguirre",
      client_contact_email: "aguirref04@gmail.com",
      phase: "active_build",
      retainer_monthly: 0,
      owner_hourly_rate: 75,
      currency: "USD",
      health_score: 78,
      start_date: "2024-09-01",
      next_calibration_date: "2026-04-01",
      notes: `${SEED_TAG} — Self-service engagement for Frank's own operations optimization`,
    })
    .select("id")
    .single();

  // Engagement 2: APT as a strategic client
  const { data: eng2 } = await supabase
    .from("engagements")
    .insert({
      organization_id: orgId,
      client_name: "All Professional Trades Inc.",
      client_contact_name: "Neil Henderson",
      client_contact_email: "neilh@allprofessionaltrades.com",
      phase: "measuring",
      retainer_monthly: 0,
      owner_hourly_rate: 75,
      currency: "USD",
      health_score: 85,
      start_date: "2025-01-15",
      next_calibration_date: "2026-04-15",
      notes: `${SEED_TAG} — B2B relationship optimization with primary client`,
    })
    .select("id")
    .single();

  if (eng1) {
    const engId = eng1.id;

    // Owner Desires
    const desires = [
      {
        raw_statement:
          "I spend too much time on quotes — want it under 10 minutes",
        value_layer: "functional",
        category: "time_reclaim",
        priority_score: 90,
        emotional_weight: 85,
        status: "partially_met",
      },
      {
        raw_statement: "I want to get paid within 30 days, not 60-90",
        value_layer: "functional",
        category: "financial_clarity",
        priority_score: 95,
        emotional_weight: 90,
        status: "active",
      },
      {
        raw_statement: "I want my guys to handle jobs without me being on-site",
        value_layer: "emotional",
        category: "delegation",
        priority_score: 80,
        emotional_weight: 75,
        status: "partially_met",
      },
      {
        raw_statement:
          "Stop losing work orders from email — every email should become a job",
        value_layer: "functional",
        category: "control",
        priority_score: 88,
        emotional_weight: 80,
        status: "met",
      },
      {
        raw_statement:
          "I need to know my real profit margins, not just revenue",
        value_layer: "functional",
        category: "financial_clarity",
        priority_score: 85,
        emotional_weight: 70,
        status: "active",
      },
      {
        raw_statement:
          "Want to scale to 30+ jobs/month without working weekends",
        value_layer: "life_changing",
        category: "freedom",
        priority_score: 92,
        emotional_weight: 95,
        status: "active",
      },
      {
        raw_statement:
          "Need a system my wife can use for billing when I'm on-site",
        value_layer: "emotional",
        category: "simplification",
        priority_score: 75,
        emotional_weight: 80,
        status: "partially_met",
      },
      {
        raw_statement:
          "I want clients to see professional completion reports, not text photos",
        value_layer: "emotional",
        category: "confidence",
        priority_score: 70,
        emotional_weight: 65,
        status: "met",
      },
    ];

    const desireIds: string[] = [];
    for (const d of desires) {
      const { data } = await supabase
        .from("owner_desires")
        .insert({ engagement_id: engId, ...d })
        .select("id")
        .single();
      if (data) desireIds.push(data.id);
    }

    // Process Activities
    const activities = [
      {
        name: "Email triage",
        value_chain_stage: "getting_work_in",
        performed_by: "Frank",
        frequency: "daily",
        estimated_hours_per_week: 5,
        is_owner_dependent: true,
      },
      {
        name: "Quote creation",
        value_chain_stage: "quoting_selling",
        performed_by: "Frank",
        frequency: "daily",
        estimated_hours_per_week: 8,
        is_owner_dependent: true,
      },
      {
        name: "Scheduling & dispatch",
        value_chain_stage: "doing_the_work",
        performed_by: "Frank",
        frequency: "daily",
        estimated_hours_per_week: 4,
        is_owner_dependent: true,
      },
      {
        name: "On-site supervision",
        value_chain_stage: "doing_the_work",
        performed_by: "Frank",
        frequency: "daily",
        estimated_hours_per_week: 20,
        is_owner_dependent: true,
      },
      {
        name: "Photo documentation",
        value_chain_stage: "doing_the_work",
        performed_by: "Subcontractors",
        frequency: "per_job",
        estimated_hours_per_week: 2,
        is_owner_dependent: false,
      },
      {
        name: "Invoice generation",
        value_chain_stage: "getting_paid",
        performed_by: "Frank",
        frequency: "weekly",
        estimated_hours_per_week: 3,
        is_owner_dependent: true,
      },
      {
        name: "Payment follow-up",
        value_chain_stage: "getting_paid",
        performed_by: "Frank",
        frequency: "weekly",
        estimated_hours_per_week: 2,
        is_owner_dependent: true,
      },
      {
        name: "Bank reconciliation",
        value_chain_stage: "back_office",
        performed_by: "Frank",
        frequency: "monthly",
        estimated_hours_per_week: 4,
        is_owner_dependent: true,
      },
      {
        name: "Sub payout",
        value_chain_stage: "getting_paid",
        performed_by: "Frank",
        frequency: "biweekly",
        estimated_hours_per_week: 1,
        is_owner_dependent: true,
      },
      {
        name: "Client communication",
        value_chain_stage: "quoting_selling",
        performed_by: "Frank",
        frequency: "daily",
        estimated_hours_per_week: 5,
        is_owner_dependent: true,
      },
      {
        name: "Material procurement",
        value_chain_stage: "doing_the_work",
        performed_by: "Frank + Subs",
        frequency: "per_job",
        estimated_hours_per_week: 3,
        is_owner_dependent: false,
      },
      {
        name: "Marketing & lead gen",
        value_chain_stage: "growing_the_business",
        performed_by: "Frank",
        frequency: "weekly",
        estimated_hours_per_week: 1,
        is_owner_dependent: true,
      },
    ];

    for (const a of activities) {
      await supabase
        .from("process_activities")
        .insert({ engagement_id: engId, ...a });
    }

    // Tools
    const tools = [
      {
        name: "Gmail",
        type: "saas",
        monthly_cost: 12,
        user_count: 2,
        integration_status: "partially_integrated",
        satisfaction_score: 3,
      },
      {
        name: "QuickBooks Online",
        type: "saas",
        monthly_cost: 55,
        user_count: 1,
        integration_status: "standalone",
        satisfaction_score: 2,
        intervention_action: "Replace with in-app finance",
      },
      {
        name: "FHI App (this system)",
        type: "custom_build",
        monthly_cost: 0,
        user_count: 3,
        integration_status: "fully_integrated",
        satisfaction_score: 4,
      },
      {
        name: "Excel Spreadsheets",
        type: "spreadsheet",
        monthly_cost: 0,
        user_count: 1,
        integration_status: "to_be_replaced",
        satisfaction_score: 1,
        intervention_action: "Migrate to app dashboards",
      },
      {
        name: "Phone/Text",
        type: "messaging",
        monthly_cost: 80,
        user_count: 2,
        integration_status: "standalone",
        satisfaction_score: 3,
      },
      {
        name: "Paper job folders",
        type: "paper",
        monthly_cost: 0,
        user_count: 1,
        integration_status: "to_be_replaced",
        satisfaction_score: 1,
        intervention_action: "Digitize via app",
      },
    ];

    for (const t of tools) {
      await supabase
        .from("tools")
        .insert({ engagement_id: engId, ...t, notes: SEED_TAG });
    }

    // Friction Items
    const frictions = [
      {
        description: "Manual quote creation takes 30-45 minutes per job",
        category: "admin_duplication",
        data_source: "task_shadow",
        occurrences_per_week: 15,
        duration_minutes: 40,
        cognitive_load_score: 7,
        quadrant: "strategic_investment",
        status: "resolving",
      },
      {
        description: "Lost emails from dispatchers — jobs fall through cracks",
        category: "followup_failures",
        data_source: "self_report",
        occurrences_per_week: 2,
        duration_minutes: 60,
        cognitive_load_score: 9,
        quadrant: "quick_win",
        status: "resolved",
      },
      {
        description: "Payment collection averages 52 days",
        category: "revenue_leakage",
        data_source: "analytics",
        occurrences_per_week: 1,
        duration_minutes: 120,
        cognitive_load_score: 8,
        quadrant: "strategic_investment",
        status: "targeted",
      },
      {
        description: "No visibility into job profitability until month-end",
        category: "manual_reporting",
        data_source: "self_report",
        occurrences_per_week: 1,
        duration_minutes: 180,
        cognitive_load_score: 6,
        quadrant: "strategic_investment",
        status: "resolving",
      },
      {
        description: "Frank must be on-site for every job start",
        category: "owner_dependency",
        data_source: "task_shadow",
        occurrences_per_week: 12,
        duration_minutes: 90,
        cognitive_load_score: 8,
        quadrant: "strategic_investment",
        status: "targeted",
      },
      {
        description: "Scheduling conflicts — double-booking subs",
        category: "scheduling_chaos",
        data_source: "self_report",
        occurrences_per_week: 1,
        duration_minutes: 45,
        cognitive_load_score: 7,
        quadrant: "quick_win",
        status: "resolved",
      },
      {
        description: "Manual bank reconciliation takes full Saturday",
        category: "admin_duplication",
        data_source: "task_shadow",
        occurrences_per_week: 0.25,
        duration_minutes: 360,
        cognitive_load_score: 5,
        quadrant: "maintenance_fix",
        status: "resolving",
      },
      {
        description: "Completion photos sent via text — no audit trail",
        category: "communication_overhead",
        data_source: "self_report",
        occurrences_per_week: 8,
        duration_minutes: 15,
        cognitive_load_score: 4,
        quadrant: "quick_win",
        status: "resolved",
      },
      {
        description: "Client follow-ups for approvals are manual",
        category: "followup_failures",
        data_source: "self_report",
        occurrences_per_week: 5,
        duration_minutes: 10,
        cognitive_load_score: 5,
        quadrant: "quick_win",
        status: "targeted",
      },
      {
        description: "No recurring invoice automation",
        category: "admin_duplication",
        data_source: "self_report",
        occurrences_per_week: 2,
        duration_minutes: 30,
        cognitive_load_score: 3,
        quadrant: "maintenance_fix",
        status: "resolving",
      },
    ];

    const frictionIds: string[] = [];
    for (let fi = 0; fi < frictions.length; fi++) {
      const f = frictions[fi];
      const { data } = await supabase
        .from("friction_items")
        .insert({
          engagement_id: engId,
          owner_desire_id: desireIds[fi % desireIds.length] || null,
          ...f,
          risk_probability: randomAmount(0.3, 0.9),
          risk_impact: randomInt(3, 9),
          composite_priority: randomInt(50, 100),
          notes: SEED_TAG,
        })
        .select("id")
        .single();
      if (data) frictionIds.push(data.id);
    }

    // Interventions
    const interventions = [
      {
        name: "AI Email Ingestion Agent",
        type: "automation",
        status: "deployed",
        estimated_build_hours: 40,
        projected_weekly_hours_saved: 5,
        deployment_date: "2025-06-01",
      },
      {
        name: "One-Click Quote Builder",
        type: "workflow_redesign",
        status: "deployed",
        estimated_build_hours: 60,
        projected_weekly_hours_saved: 6,
        deployment_date: "2025-08-15",
      },
      {
        name: "Sub Photo Upload Portal",
        type: "custom_build",
        status: "deployed",
        estimated_build_hours: 20,
        projected_weekly_hours_saved: 2,
        deployment_date: "2025-10-01",
      },
      {
        name: "CFO Dashboard",
        type: "dashboard_build",
        status: "measuring",
        estimated_build_hours: 30,
        projected_weekly_hours_saved: 4,
        deployment_date: "2026-01-15",
      },
      {
        name: "Automated Payment Reminders",
        type: "automation",
        status: "in_progress",
        estimated_build_hours: 15,
        projected_weekly_hours_saved: 2,
      },
      {
        name: "Google Calendar Scheduling",
        type: "integration",
        status: "deployed",
        estimated_build_hours: 25,
        projected_weekly_hours_saved: 3,
        deployment_date: "2025-11-01",
      },
      {
        name: "Recurring Invoice Engine",
        type: "automation",
        status: "in_progress",
        estimated_build_hours: 20,
        projected_weekly_hours_saved: 1,
      },
      {
        name: "Bank Feed Auto-Classification",
        type: "automation",
        status: "measuring",
        estimated_build_hours: 35,
        projected_weekly_hours_saved: 3,
        deployment_date: "2026-02-01",
      },
    ];

    const interventionIds: string[] = [];
    for (const inv of interventions) {
      const { data } = await supabase
        .from("interventions")
        .insert({
          engagement_id: engId,
          name: inv.name,
          description: `${inv.name} — ${inv.type}`,
          type: inv.type,
          status: inv.status,
          estimated_build_hours: inv.estimated_build_hours,
          estimated_build_cost: (inv.estimated_build_hours || 0) * 75,
          projected_weekly_hours_saved: inv.projected_weekly_hours_saved,
          projected_monthly_value:
            (inv.projected_weekly_hours_saved || 0) * 4 * 75,
          projection_band: "expected",
          deployment_date: inv.deployment_date || null,
          first_measurement_date: inv.deployment_date
            ? formatDate(
                new Date(
                  new Date(inv.deployment_date).getTime() + 30 * 86400000,
                ),
              )
            : null,
        })
        .select("id")
        .single();
      if (data) interventionIds.push(data.id);
    }

    // Relief Metrics
    const metrics = [
      {
        name: "Quote creation time",
        metric_type: "time_reclaimed",
        unit: "minutes",
        direction: "decrease",
        baseline_value: 40,
        target_value: 10,
        current_value: 15,
        status: "tracking",
      },
      {
        name: "Email-to-job conversion rate",
        metric_type: "task_count",
        unit: "percent",
        direction: "increase",
        baseline_value: 60,
        target_value: 95,
        current_value: 92,
        status: "validated",
      },
      {
        name: "Average days to payment",
        metric_type: "time_reclaimed",
        unit: "days",
        direction: "decrease",
        baseline_value: 52,
        target_value: 25,
        current_value: 38,
        status: "tracking",
      },
      {
        name: "Jobs requiring Frank on-site",
        metric_type: "task_count",
        unit: "percent",
        direction: "decrease",
        baseline_value: 100,
        target_value: 40,
        current_value: 65,
        status: "tracking",
      },
      {
        name: "Monthly reconciliation time",
        metric_type: "time_reclaimed",
        unit: "hours",
        direction: "decrease",
        baseline_value: 6,
        target_value: 1,
        current_value: 2.5,
        status: "tracking",
      },
      {
        name: "Job profit visibility lag",
        metric_type: "time_reclaimed",
        unit: "days",
        direction: "decrease",
        baseline_value: 30,
        target_value: 0,
        current_value: 1,
        status: "validated",
      },
      {
        name: "Sub scheduling conflicts/month",
        metric_type: "error_rate",
        unit: "count",
        direction: "decrease",
        baseline_value: 4,
        target_value: 0,
        current_value: 0.5,
        status: "validated",
      },
      {
        name: "Photo documentation rate",
        metric_type: "task_count",
        unit: "percent",
        direction: "increase",
        baseline_value: 30,
        target_value: 90,
        current_value: 82,
        status: "tracking",
      },
      {
        name: "Client satisfaction (NPS proxy)",
        metric_type: "satisfaction",
        unit: "score",
        direction: "increase",
        baseline_value: 6,
        target_value: 9,
        current_value: 8,
        status: "tracking",
      },
      {
        name: "Overall engagement ROI",
        metric_type: "engagement_roi",
        unit: "multiplier",
        direction: "increase",
        baseline_value: 0,
        target_value: 5,
        current_value: 3.2,
        status: "tracking",
      },
    ];

    const metricIds: string[] = [];
    for (let mi = 0; mi < metrics.length; mi++) {
      const m = metrics[mi];
      const { data } = await supabase
        .from("relief_metrics")
        .insert({
          engagement_id: engId,
          intervention_id: interventionIds[mi % interventionIds.length] || null,
          name: m.name,
          metric_type: m.metric_type,
          unit: m.unit,
          direction: m.direction,
          baseline_value: m.baseline_value,
          baseline_date: "2024-09-15",
          baseline_source: "task_shadow",
          target_value: m.target_value,
          current_value: m.current_value,
          current_date: "2026-03-01",
          confidence_level: "medium",
          measurement_method: pick(["automated", "self_report", "analytics"]),
          measurement_frequency: "monthly",
          status: m.status,
        })
        .select("id")
        .single();
      if (data) metricIds.push(data.id);
    }

    // Metric Snapshots (monthly for ~6 months)
    for (const metricId of metricIds) {
      const metric = metrics[metricIds.indexOf(metricId)];
      for (let month = 0; month < 6; month++) {
        const snapDate = new Date(2025, 9 + month, 15);
        const progress = (month + 1) / 8;
        const measuredValue =
          metric.baseline_value +
          (metric.current_value - metric.baseline_value) *
            progress *
            (0.8 + seededRandom() * 0.4);

        await supabase.from("metric_snapshots").insert({
          relief_metric_id: metricId,
          engagement_id: engId,
          measured_value: Math.round(measuredValue * 10) / 10,
          projected_value:
            metric.baseline_value +
            (metric.target_value - metric.baseline_value) * progress,
          variance_pct: Math.round((seededRandom() * 30 - 15) * 10) / 10,
          source: pick(["analytics", "self_report", "automated"]),
          notes: `Month ${month + 1} measurement`,
          measured_at: formatTimestamp(snapDate),
        });
      }
    }

    // Calibration Cycles
    for (let cc = 0; cc < 4; cc++) {
      const cycleDate = new Date(2025, 9 + cc * 3, 1);
      await supabase.from("calibration_cycles").insert({
        engagement_id: engId,
        cycle_number: cc + 1,
        scheduled_date: formatDate(cycleDate),
        completed_date:
          cc < 3
            ? formatDate(
                new Date(cycleDate.getTime() + randomInt(0, 5) * 86400000),
              )
            : null,
        status: cc < 3 ? "completed" : "scheduled",
        overall_projection_accuracy: cc < 3 ? randomAmount(0.7, 0.95) : null,
        new_friction_count: cc < 3 ? randomInt(0, 3) : null,
        owner_satisfaction_score: cc < 3 ? randomInt(7, 10) : null,
        confidence_adjustment:
          cc < 3 ? pick(["tightened", "unchanged", "unchanged"]) : null,
        recommendations:
          cc < 3
            ? pick([
                "Continue current trajectory. Payment automation showing strong results.",
                "Quote time improving but not yet at target. Consider AI-assisted quote generation.",
                "Photo documentation rate up 50%. Sub adoption exceeding expectations.",
              ])
            : null,
        health_score_calculated: cc < 3 ? randomInt(72, 88) : null,
        notes: SEED_TAG,
      });
    }

    // Link tables: friction_intervention_links, intervention_desire_links
    for (
      let li = 0;
      li < Math.min(frictionIds.length, interventionIds.length);
      li++
    ) {
      await supabase.from("friction_intervention_links").insert({
        friction_item_id: frictionIds[li],
        intervention_id: interventionIds[li % interventionIds.length],
      });
    }
    for (
      let li = 0;
      li < Math.min(desireIds.length, interventionIds.length);
      li++
    ) {
      await supabase.from("intervention_desire_links").insert({
        intervention_id: interventionIds[li],
        owner_desire_id: desireIds[li % desireIds.length],
      });
    }
  }

  console.log(
    `  ✓ Outcome Engine: 2 engagements, desires, activities, tools, frictions, interventions, metrics, snapshots, calibrations`,
  );

  // ══════════════════════════════════════════════════════════════════════
  // DONE
  // ══════════════════════════════════════════════════════════════════════
  console.log("\n═══════════════════════════════════════════════════════");
  console.log("🎉 UAT SEED COMPLETE");
  console.log(`   Jobs: ${allJobIds.length}`);
  console.log(`   Clients: ${clientIds.length}`);
  console.log(`   Subcontractors: ${subIds.length}`);
  console.log(`   Properties: ${propertyIds.length}`);
  console.log(`   Buildings: ${buildingIds.length}`);
  console.log(`   Units: ${unitRecordsAll.length}`);
  console.log(`   Turnovers: ${turnoverCount}`);
  console.log(`   Finance Transactions: ${txnCount}`);
  console.log(`   Notifications: ${notifCount}`);
  console.log(`   Email Logs: ${emailLogCount}`);
  console.log("═══════════════════════════════════════════════════════\n");
}

seed().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
