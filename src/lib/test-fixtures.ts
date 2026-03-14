/**
 * Test email fixtures for simulating inbound work orders.
 * Used by the Test Bench page (/ops/test-bench) to validate email ingestion.
 */

export type TestFixture = {
  id: string;
  name: string;
  description: string;
  scenario: 'new_work_order' | 'add_photos' | 'punch_list';
  payload: {
    from: { address: string; name?: string };
    subject: string;
    text: string;
    attachments?: string[];
  };
  expectedFields?: {
    trade_type?: string;
    urgency?: string;
    has_address?: boolean;
  };
};

export const TEST_FIXTURES: TestFixture[] = [
  {
    id: 'meryl-bathroom-remodel',
    name: 'Meryl — Bathroom Remodel',
    description: 'Standard bathroom remodel request with painting and drywall. Unit 305.',
    scenario: 'new_work_order',
    payload: {
      from: { address: 'meryl@allprofessionaltrades.com', name: 'Meryl Thompson' },
      subject: 'Work Order: 42 Oakwood Drive Unit 305 - Bathroom Remodel',
      text: `Hi Frank,

We need a bathroom remodel at 42 Oakwood Drive, Unit 305. The tenant moved out and the bathroom needs work before the new tenant moves in.

Scope of work:
- Repaint bathroom walls and ceiling (currently dark blue, needs to go white)
- Patch and repair drywall above the bathtub (water damage, approx 3x2 ft area)
- Replace bathroom vanity (we will provide the new vanity)
- Caulk around bathtub and shower

Tenant move-in is April 1st so we'd like this done before then.

Please provide a quote when you can.

Thanks,
Meryl Thompson
All Professional Trades Inc.`,
    },
    expectedFields: {
      trade_type: 'Painting',
      has_address: true,
    },
  },
  {
    id: 'cole-hvac-repair',
    name: 'Cole — HVAC Emergency (Rush)',
    description: 'Urgent HVAC repair request. Should trigger rush detection.',
    scenario: 'new_work_order',
    payload: {
      from: { address: 'cole@allprofessionaltrades.com', name: 'Cole Mitchell' },
      subject: 'URGENT: 18 Pine Street Unit 102 - No Heat',
      text: `Frank,

This is urgent — tenant at 18 Pine Street, Unit 102 has no heat. Need someone ASAP.

The furnace is making a clicking noise but not igniting. Thermostat shows it's calling for heat but nothing happens. Tenant says it stopped working last night.

Please get someone out there today if possible. This is a rush job.

Cole Mitchell
All Professional Trades Inc.`,
    },
    expectedFields: {
      trade_type: 'HVAC',
      urgency: 'rush',
      has_address: true,
    },
  },
  {
    id: 'meryl-kitchen-painting',
    name: 'Meryl — Kitchen & Living Room Paint',
    description: 'Multi-room painting job with specific color requests.',
    scenario: 'new_work_order',
    payload: {
      from: { address: 'meryl@allprofessionaltrades.com', name: 'Meryl Thompson' },
      subject: 'Paint Job: 7 Elm Court Unit 201 - Kitchen & Living Room',
      text: `Frank,

Unit 201 at 7 Elm Court needs painting in the kitchen and living room areas.

- Kitchen walls: Currently yellow, needs to be repainted in "Agreeable Gray" (SW 7029)
- Kitchen ceiling: White, just needs a fresh coat
- Living room: All walls need repainting, currently has some scuff marks and nail holes that need patching first
- Living room ceiling has a small water stain near the window — please assess if drywall repair is needed

The unit is vacant so you can schedule at your convenience. No rush on this one.

Meryl`,
    },
    expectedFields: {
      trade_type: 'Painting',
      urgency: 'standard',
      has_address: true,
    },
  },
  {
    id: 'cole-electrical-outlets',
    name: 'Cole — Electrical Outlets',
    description: 'Electrical work needed — outlet replacement and GFCI install.',
    scenario: 'new_work_order',
    payload: {
      from: { address: 'cole@allprofessionaltrades.com', name: 'Cole Mitchell' },
      subject: 'Electrical: 55 Birch Lane Unit 404 - Outlet Issues',
      text: `Hey Frank,

Got a few electrical items at 55 Birch Lane, Unit 404:

1. Kitchen outlet near the sink is not working — may need GFCI replacement
2. Two bedroom outlets have cracked faceplates and feel loose — need replacing
3. Bathroom exhaust fan is making a loud grinding noise — may need motor replacement

Tenant will be home, so coordinate access with them. Their number is 555-0147.

Due by end of next week.

Thanks,
Cole`,
    },
    expectedFields: {
      trade_type: 'Electrical',
      has_address: true,
    },
  },
  {
    id: 'meryl-turnover-full',
    name: 'Meryl — Full Unit Turnover',
    description: 'Comprehensive unit turnover with multiple trades.',
    scenario: 'new_work_order',
    payload: {
      from: { address: 'meryl@allprofessionaltrades.com', name: 'Meryl Thompson' },
      subject: 'Full Turnover: 123 Maple Avenue Unit 8',
      text: `Hi Frank,

We have a full unit turnover at 123 Maple Avenue, Unit 8. Previous tenant just moved out and we need the following:

PAINTING:
- All rooms need fresh paint (walls and ceilings) — standard white throughout
- Trim and baseboards need painting too — lots of scuffs

REPAIRS:
- Patch 4 medium-sized holes in living room walls (from mounted TV and shelving)
- Fix kitchen cabinet door that's hanging off the hinge
- Bathroom door doesn't close properly — needs adjustment

CLEANING:
- Deep clean of all carpets
- Clean oven and range hood

PLUMBING:
- Kitchen faucet is dripping
- Bathroom toilet runs intermittently

New tenant moves in March 28th so we need everything done by March 25th.

Please send a quote covering everything.

Thanks,
Meryl`,
    },
    expectedFields: {
      trade_type: 'General',
      has_address: true,
    },
  },
  {
    id: 'neil-punch-list',
    name: 'Neil — Punch List Response',
    description: 'Neil sends back issues after inspecting a completed job.',
    scenario: 'punch_list',
    payload: {
      from: { address: 'neilh@allprofessionaltrades.com', name: 'Neil Henderson' },
      subject: 'Re: Completion Report FHI-2026-001 — Punch List Items',
      text: `Frank,

Inspected the unit today. Most of the work looks good but I found a few things that need to be addressed:

1. Living room — paint drip on the baseboard near the front door
2. Kitchen — the cabinet door you fixed is still sticking when you try to close it
3. Bathroom — missed a spot on the ceiling near the vent, you can still see the old stain through the paint

Can you get your guys back out there to touch these up? Send me updated photos when done.

Neil Henderson
All Professional Trades Inc.`,
    },
    expectedFields: {},
  },
];
