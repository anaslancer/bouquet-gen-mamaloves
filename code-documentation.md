# Detailed Code Explanation: Bouquet Generator Server

## Overview Architecture

The server is structured as a **modular Express.js API** with clear separation of concerns:

```
server/
├── index.ts              ← Entry point, Express setup
├── routes.ts             ← API endpoint definitions
└── helpers/
    ├── types.ts          ← TypeScript interfaces
    ├── constants.ts      ← Configuration data
    ├── layout.ts         ← Position calculation algorithm
    ├── svg-utils.ts      ← SVG file handling
    └── bouquet-generator.ts  ← Main orchestration

shared/
└── schema.ts             ← Validation schemas (Zod)
```

---

## 1. `shared/schema.ts` - Validation & Types

**Purpose:** Define shared types and request validation using Zod.

### Constants:
```typescript
export const DUTCH_MONTHS = [
  'Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni',
  'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'
] as const;
```
- Array of Dutch month names (as used in Shopify orders from Netherlands)
- `as const` makes it a readonly tuple for type inference

### Types:
```typescript
export type DutchMonth = typeof DUTCH_MONTHS[number];  // Union type of all months
export type CharmShape = 'coin' | 'oval' | 'heart' | 'round';  // Jewelry charm shapes
```

### Validation Schema:
```typescript
export const generateBouquetSchema = z.object({
  flowers: z.array(z.string()).min(1).max(5),  // 1-5 flower names
  charmShape: z.enum(['coin', 'oval', 'heart', 'round']).default('coin'),  // Optional, defaults to 'coin'
});
```
- Uses **Zod** for runtime validation
- Ensures request has 1-5 flowers
- Auto-defaults charmShape if not provided

---

## 2. `server/helpers/types.ts` - TypeScript Interfaces

**Purpose:** Define data structures used throughout the generator.

### `Point`
```typescript
export interface Point {
  x: number;
  y: number;
}
```
- Simple 2D coordinate
- Used for flower positions and binding point

### `FlowerSlot`
```typescript
export interface FlowerSlot {
  position: Point;      // Where flower center goes (x, y)
  angle: number;        // Degrees from center (e.g., -30° for left flower)
  tilt: number;         // How much the flower rotates (visual effect)
  scale: number;        // Size multiplier (0.14 = 14% of original)
  stemLength: number;   // Pixel distance from binding point
}
```
- Represents **one flower's placement** in the bouquet
- Each slot defines where and how a flower appears

### `LayoutTemplate`
```typescript
export interface LayoutTemplate {
  flowerCount: number;
  bindingPoint: Point;  // Where all stems meet (bottom center)
  slots: FlowerSlot[];  // Array of flower positions
  viewBox: { width: number; height: number };  // SVG canvas size
}
```
- Complete layout for an entire bouquet
- Contains all flower slots plus the common binding point

### `FlowerSVG`
```typescript
export interface FlowerSVG {
  content: string;      // The actual SVG markup (<g>...</g>)
  width: number;        // Original width from viewBox
  height: number;       // Original height from viewBox
}
```
- Parsed flower asset data ready for composition

---

## 3. `server/helpers/constants.ts` - Configuration Data

**Purpose:** Centralized configuration for the generator algorithm.

### `MONTH_TO_FLOWER`
```typescript
export const MONTH_TO_FLOWER: Record<string, string> = {
  'Januari': 'january',
  'Februari': 'february',
  // ... etc
};
```
- **Maps Dutch month names → English flower folder names**
- Shopify orders use Dutch; file system uses English

### `FLOWER_FILES`
```typescript
export const FLOWER_FILES: Record<string, { left: string; center: string; right: string }> = {
  january: {
    left: 'january_mostly_used_left.svg',
    center: 'january_simple_mostly_used_in_the_middle.svg',
    right: 'january_mirrored_mostly_used_right.svg',
  },
  // ... for all 12 months
};
```
- **Each flower has 3 variants:**
  - `left` - Used for flowers on the left side (faces right)
  - `center` - Used for middle flower (faces forward)
  - `right` - Used for flowers on the right (faces left, mirrored)
- This creates natural-looking asymmetric bouquets

### `LAYOUT_ANGLES`
```typescript
export const LAYOUT_ANGLES: Record<number, number[]> = {
  1: [0],              // Single flower: centered
  2: [-25, 25],        // Two flowers: spread 50° apart
  3: [-30, 0, 30],     // Three: left, center, right
  4: [-40, -15, 15, 40],
  5: [-45, -22, 0, 22, 45],  // Five: fan pattern
};
```
- **Predefined angular positions** for 1-5 flowers
- Negative = left of center, Positive = right of center
- Creates **fan/arc pattern** above the binding point

### Layout Tuning Constants:
```typescript
export const TILT_MULTIPLIER = 0.5;    // How much flowers lean outward
export const BASE_STEM_LENGTH = 120;   // Default stem length in pixels
export const HEIGHT_VARIATION = 15;    // Pixels difference for dome shape
```

### `SPREAD_MULTIPLIER`
```typescript
export const SPREAD_MULTIPLIER: Record<CharmShape, number> = {
  coin: 1.0,    // Full spread (circular charm)
  round: 0.9,   // Slightly tighter
  oval: 0.65,   // Much tighter (narrow charm)
  heart: 0.85,  // Medium spread
};
```
- **Adjusts angular spread based on charm shape**
- Oval charms are narrow → flowers must be closer together

### `SVG_CONFIG`
```typescript
export const SVG_CONFIG = {
  viewBoxWidth: 400,      // Canvas width
  viewBoxHeight: 400,     // Canvas height
  strokeColor: '#000000', // Black lines for laser engraving
  strokeWidth: 1.5,       // Line thickness
};
```

---

## 4. `server/helpers/layout.ts` - Position Algorithm

**Purpose:** Calculate where each flower goes in the bouquet.

### Core Rules (documented in comments):
1. All stems converge at a **binding point** at bottom center
2. Flowers **fan out in an arc** above the binding point
3. Flowers **tilt outward** (left flowers lean left, right lean right)
4. **Staggered heights** create dome shape (center is higher)

---

### Function: `getHeightVariation(index, total)`
```typescript
function getHeightVariation(index: number, total: number): number {
  if (total === 1) return 0;
  const centerIndex = (total - 1) / 2;
  const distanceFromCenter = Math.abs(index - centerIndex);
  return distanceFromCenter * HEIGHT_VARIATION;
}
```
**What it does:**
- Creates **dome shape** where center flower is highest
- Edge flowers have longer stems (extend further)

**Example with 5 flowers:**
- Index 0 (leftmost): distance = 2 → variation = 30px
- Index 2 (center): distance = 0 → variation = 0px
- Index 4 (rightmost): distance = 2 → variation = 30px

---

### Function: `getFlowerPosition(slotIndex, totalSlots)`
```typescript
export function getFlowerPosition(slotIndex: number, totalSlots: number): 'left' | 'center' | 'right' {
  if (totalSlots === 1) return 'center';
  const centerIndex = (totalSlots - 1) / 2;
  if (slotIndex < centerIndex - 0.5) return 'left';
  if (slotIndex > centerIndex + 0.5) return 'right';
  return 'center';
}
```
**What it does:**
- Determines which **SVG variant** to use for each flower
- Uses threshold of ±0.5 from center

**Example with 3 flowers:**
- Index 0 → left (uses left-facing flower)
- Index 1 → center (uses front-facing flower)
- Index 2 → right (uses right-facing/mirrored flower)

---

### Function: `getAdaptiveScale(flowerCount)`
```typescript
function getAdaptiveScale(flowerCount: number): number {
  const baseScale = 0.14;  // 14% of original size
  const scaleReduction = Math.max(0, (flowerCount - 1) * 0.015);
  return Math.max(0.08, baseScale - scaleReduction);  // Minimum 8%
}
```
**What it does:**
- **Shrinks flowers when there are more of them**
- Prevents overlap by making flowers smaller
- 1 flower = 14%, 5 flowers = 8%

---

### Function: `getMinSpacing(flowerCount, scale)`
```typescript
function getMinSpacing(flowerCount: number, scale: number): number {
  const avgFlowerSize = 500 * scale;  // Approximate flower dimension
  return avgFlowerSize * 0.9;  // 90% of flower size
}
```
**What it does:**
- Calculates **minimum distance between flower centers**
- Used by collision detection

---

### Function: `generateLayout(flowerCount, charmShape)` - MAIN
```typescript
export function generateLayout(flowerCount: number, charmShape: CharmShape): LayoutTemplate {
```

**Step-by-step logic:**

1. **Define binding point** (where stems meet):
   ```typescript
   const bindingPoint: Point = {
     x: viewBoxWidth / 2,      // Horizontal center = 200
     y: viewBoxHeight * 0.85,  // 85% down = 340
   };
   ```

2. **Get spread multiplier** for charm shape:
   ```typescript
   const spreadMultiplier = SPREAD_MULTIPLIER[charmShape] || 1.0;
   ```

3. **Get base angles** for flower count:
   ```typescript
   const baseAngles = LAYOUT_ANGLES[flowerCount] || LAYOUT_ANGLES[3];
   ```

4. **Calculate adaptive scale and spacing:**
   ```typescript
   const scale = getAdaptiveScale(flowerCount);
   const minSpacing = getMinSpacing(flowerCount, scale);
   ```

5. **Generate slots for each flower:**
   ```typescript
   let slots: FlowerSlot[] = baseAngles.map((angle, index) => {
     // Adjust angle based on charm shape
     const adjustedAngle = angle * spreadMultiplier;
     
     // Convert to radians (subtract 90° because 0° = up, not right)
     const angleRad = (adjustedAngle - 90) * (Math.PI / 180);
     
     // Calculate stem length with height variation
     const stemLength = BASE_STEM_LENGTH + getHeightVariation(index, flowerCount);
     
     // Calculate position using polar coordinates
     const position: Point = {
       x: bindingPoint.x + Math.cos(angleRad) * stemLength,
       y: bindingPoint.y + Math.sin(angleRad) * stemLength,
     };
     
     // Tilt = angle × 0.5 (flowers lean outward)
     const tilt = adjustedAngle * TILT_MULTIPLIER;
     
     return { position, angle: adjustedAngle, tilt, scale, stemLength };
   });
   ```

6. **Apply collision detection:**
   ```typescript
   slots = adjustForCollisions(slots, bindingPoint, minSpacing);
   ```

---

### Function: `adjustForCollisions(slots, bindingPoint, minSpacing)`
```typescript
function adjustForCollisions(slots: FlowerSlot[], bindingPoint: Point, minSpacing: number): FlowerSlot[] {
  if (slots.length <= 1) return slots;
  
  for (let i = 0; i < slots.length - 1; i++) {
    const dist = distance(slots[i].position, slots[i + 1].position);
    
    if (dist < minSpacing) {
      // Increase stem length to push flowers apart
      const adjustment = (minSpacing - dist) / 2;
      slots[i].stemLength += adjustment;
      slots[i + 1].stemLength += adjustment;
      
      // Recalculate positions
      // ... (polar coordinate recalculation)
    }
  }
  return slots;
}
```
**What it does:**
- Checks distance between **adjacent flowers**
- If too close, **extends stem length** to push them apart
- Simple but effective collision avoidance

---

### Function: `generateStemPath(from, to)`
```typescript
export function generateStemPath(from: Point, to: Point): string {
  const midY = (from.y + to.y) / 2;
  const ctrl1 = { x: from.x, y: midY };
  const ctrl2 = { x: to.x, y: midY };
  
  return `M ${from.x} ${from.y} C ${ctrl1.x} ${ctrl1.y}, ${ctrl2.x} ${ctrl2.y}, ${to.x} ${to.y}`;
}
```
**What it does:**
- Creates **SVG cubic Bezier curve** for stem
- Uses control points at mid-height for smooth curve
- Result: natural curved stem connecting flower to binding point

---

## 5. `server/helpers/svg-utils.ts` - SVG Handling

**Purpose:** Load flower SVGs and compose final bouquet.

---

### Function: `convertToStrokeOnly(content)`
```typescript
function convertToStrokeOnly(content: string): string {
  let result = content;
  
  // Replace all fills with none
  result = result.replace(/fill="[^"]*"/g, 'fill="none"');
  
  // Replace inline fill styles
  result = result.replace(/fill:[^;"]*/g, 'fill:none');
  
  // Add stroke to paths that don't have one
  result = result.replace(/<path([^>]*?)(?<!stroke="[^"]*")\s*>/g, (match, attrs) => {
    if (!attrs.includes('stroke=')) {
      return `<path${attrs} stroke="#000000" stroke-width="1.5">`;
    }
    return match;
  });
  
  // Convert stroke="none" to actual stroke
  result = result.replace(/stroke="none"/g, 'stroke="#000000"');
  
  return result;
}
```
**What it does:**
- **Critical for laser engraving** - removes filled shapes
- Converts filled silhouettes → stroke-only outlines
- Laser engravers follow paths, not fill areas

---

### Function: `parseSVG(svgContent)`
```typescript
function parseSVG(svgContent: string): FlowerSVG {
  // Extract viewBox dimensions
  const viewBoxMatch = svgContent.match(/viewBox="([^"]+)"/);
  // ... parse width and height
  
  // Extract <g> element content
  const gMatch = svgContent.match(/<g[^>]*>([\s\S]*)<\/g>/i);
  let content = gMatch ? gMatch[0] : '';
  
  // Convert to stroke-only
  content = convertToStrokeOnly(content);
  
  return { content, width, height };
}
```
**What it does:**
- Parses SVG file to extract dimensions and inner content
- Applies stroke-only conversion
- Returns structured data for composition

---

### Function: `loadFlowerSVG(month, position)`
```typescript
export function loadFlowerSVG(month: string, position: 'left' | 'center' | 'right'): FlowerSVG | null {
  // Map Dutch month → English flower name
  const flowerName = MONTH_TO_FLOWER[month];
  
  // Get file mapping for left/center/right variant
  const fileMapping = FLOWER_FILES[flowerName];
  const fileName = fileMapping[position];
  
  // Read and parse SVG file
  const content = fs.readFileSync(filePath, 'utf8');
  return parseSVG(content);
}
```
**What it does:**
- Loads correct flower variant for given month and position
- Example: `loadFlowerSVG('Januari', 'left')` → loads `january_mostly_used_left.svg`

---

### Function: `transformFlower(flower, slot, index)`
```typescript
function transformFlower(flower: FlowerSVG, slot: FlowerSlot, index: number): string {
  const { position, tilt, scale } = slot;
  const offsetX = (flower.width * scale) / 2;
  const offsetY = (flower.height * scale) / 2;
  
  return `
    <g id="flower-${index}" 
       transform="translate(${position.x - offsetX}, ${position.y - offsetY}) 
                  rotate(${tilt}, ${offsetX}, ${offsetY}) 
                  scale(${scale})">
      ${flower.content}
    </g>`;
}
```
**What it does:**
- Wraps flower in SVG `<g>` group with transforms
- **translate**: moves to position (offset by half-size for centering)
- **rotate**: applies tilt around flower center
- **scale**: shrinks to appropriate size

---

### Function: `generateStems(layout, flowers)`
```typescript
function generateStems(layout: LayoutTemplate, flowers: Array<FlowerSVG | null>): string {
  return layout.slots.map((slot, index) => {
    if (!flowers[index]) return '';
    
    // Stem starts slightly below flower center
    const flowerBase: Point = { x: slot.position.x, y: slot.position.y + 20 };
    const pathD = generateStemPath(flowerBase, layout.bindingPoint);
    
    return `<path id="stem-${index}" d="${pathD}" fill="none" stroke="#000000" stroke-width="1.5"/>`;
  }).join('\n');
}
```
**What it does:**
- Creates curved stem paths from each flower to binding point
- Only generates stems for successfully loaded flowers

---

### Function: `composeBouquet(layout, flowers)` - MAIN
```typescript
export function composeBouquet(layout: LayoutTemplate, flowers: Array<FlowerSVG | null>): string {
  const stemsContent = generateStems(layout, flowers);
  
  const flowersContent = flowers
    .map((flower, index) => flower ? transformFlower(flower, layout.slots[index], index) : '')
    .join('\n');
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" version="1.1"
     viewBox="0 0 ${viewBox.width} ${viewBox.height}"
     width="${viewBox.width}px" height="${viewBox.height}px">
  <!-- Generated Bouquet -->
  <g id="stems">
    ${stemsContent}
  </g>
  <g id="flowers">
    ${flowersContent}
  </g>
</svg>`;
}
```
**What it does:**
- Assembles final SVG document
- **Stems drawn first** (behind flowers in visual stacking)
- **Flowers drawn second** (on top of stems)
- Result: complete bouquet SVG ready for laser engraving

---

## 6. `server/helpers/bouquet-generator.ts` - Orchestration

**Purpose:** Main entry point that coordinates all steps.

---

### Function: `generateBouquet(request)` - MAIN ENTRY
```typescript
export async function generateBouquet(request: GenerateBouquetRequest): Promise<{ filename: string; path: string }> {
```

**Complete flow:**

```
1. VALIDATE
   └─→ Check flower count (1-5)
   └─→ Check assets exist

2. GENERATE LAYOUT
   └─→ generateLayout(flowerCount, charmShape)
   └─→ Returns: slots with positions, angles, scales

3. DETERMINE POSITIONS
   └─→ For each flower index, determine left/center/right
   └─→ Uses getFlowerPosition()

4. LOAD FLOWER SVGs
   └─→ For each flower, load appropriate variant
   └─→ loadFlowerSVG(month, position)

5. COMPOSE SVG
   └─→ composeBouquet(layout, flowerSVGs)
   └─→ Returns: complete SVG string

6. SAVE TO FILE
   └─→ Write to ./generated_svg/bouquet_xxx_timestamp.svg
   └─→ Return filename and path
```

---

### Function: `extractFlowersFromLineItem(lineItem)`
```typescript
export function extractFlowersFromLineItem(lineItem: any): string[] | null {
  const flowers: string[] = [];
  
  for (const prop of lineItem.properties) {
    // Match "Voorkant geboortebloem 1", "Voorkant geboortebloem 2", etc.
    const match = prop.name?.match(/Voorkant geboortebloem (\d)/);
    if (match && prop.value) {
      const index = parseInt(match[1]) - 1;
      flowers[index] = prop.value;  // "Januari", "April", etc.
    }
  }
  
  return flowers.filter(Boolean).length > 0 ? flowers.filter(Boolean) : null;
}
```
**What it does:**
- Parses Shopify order properties to extract flower selections
- "Voorkant geboortebloem" = "Front birthflower" in Dutch
- Returns array of Dutch month names

---

### Function: `parseCharmTypeFromSKU(sku)`
```typescript
export function parseCharmTypeFromSKU(sku: string): CharmShape {
  const parts = sku.split('-');
  const code = parts[1];  // e.g., "BFB-CO-14K" → "CO"
  
  switch (code) {
    case 'CO': return 'coin';
    case 'OV': return 'oval';
    case 'HT': return 'heart';
    case 'RN': return 'round';
    default: return 'coin';
  }
}
```
**What it does:**
- Extracts charm shape from Shopify SKU code
- SKU format: `BFB-{charm_code}-{product}`

---

## 7. `server/routes.ts` - API Endpoints

**Purpose:** Define HTTP endpoints.

### `POST /api/bouquet`
```typescript
app.post('/api/bouquet', async (req, res) => {
  // 1. Validate request with Zod schema
  const parseResult = generateBouquetSchema.safeParse(req.body);
  if (!parseResult.success) return 400 error;
  
  // 2. Generate bouquet
  const result = await generateBouquet(parseResult.data);
  
  // 3. Return success
  return res.json({ ok: true, filename, path });
});
```

### `POST /api/bouquet/from-order`
```typescript
app.post('/api/bouquet/from-order', async (req, res) => {
  // 1. Get order data (handle wrapped or unwrapped format)
  const orderData = req.body.order || req.body;
  
  // 2. Loop through line items
  for (const lineItem of orderData.line_items) {
    // Skip non-birthflower products
    if (!lineItem.sku?.startsWith('BFB')) continue;
    
    // Extract flowers from properties
    const flowers = extractFlowersFromLineItem(lineItem);
    
    // Parse charm type from SKU
    const charmShape = parseCharmTypeFromSKU(lineItem.sku);
    
    // Generate bouquet
    const result = await generateBouquet({ flowers, charmShape });
    results.push(result);
  }
  
  return res.json({ ok: true, orderId, bouquets: results });
});
```

### `GET /api/bouquet/status`
```typescript
app.get('/api/bouquet/status', (req, res) => {
  return res.json({
    ok: true,
    assetsAvailable: checkAssetsExist(),
    supportedFlowerCounts: [1, 2, 3, 4, 5],
    supportedCharmShapes: ['coin', 'oval', 'heart', 'round'],
  });
});
```

---

## 8. `server/index.ts` - Server Entry Point

**Purpose:** Initialize Express server with middleware.

### Key components:

1. **JSON body parser** with raw body capture:
   ```typescript
   app.use(express.json({
     verify: (req, _res, buf) => { req.rawBody = buf; },
   }));
   ```

2. **Request logging middleware** (logs all /api calls)

3. **Route registration**:
   ```typescript
   await registerRoutes(httpServer, app);
   ```

4. **Error handling middleware**

5. **Server startup on port 5000**

---

## Complete Data Flow Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                        API REQUEST                                │
│  POST /api/bouquet                                                │
│  { flowers: ["Januari", "April", "Augustus"], charmShape: "coin" }│
└─────────────────────────────┬────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│  routes.ts → generateBouquetSchema.safeParse()                   │
│  Validates: 1-5 flowers, valid charm shape                        │
└─────────────────────────────┬────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│  bouquet-generator.ts → generateBouquet()                        │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ 1. generateLayout(3, 'coin')                              │    │
│  │    → Calculates positions for 3 flowers                   │    │
│  │    → Binding point: (200, 340)                            │    │
│  │    → Angles: [-30°, 0°, 30°]                              │    │
│  │    → Scale: 0.11 (adaptive)                               │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ 2. getFlowerPosition() for each                          │    │
│  │    → Index 0: 'left'                                      │    │
│  │    → Index 1: 'center'                                    │    │
│  │    → Index 2: 'right'                                     │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ 3. loadFlowerSVG() for each                              │    │
│  │    → 'Januari' + 'left' → january_mostly_used_left.svg   │    │
│  │    → 'April' + 'center' → april_mostly_used_left.svg     │    │
│  │    → 'Augustus' + 'right' → august_single_flower_mirrored│    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ 4. composeBouquet()                                       │    │
│  │    → Generate stems (curved Bezier paths)                 │    │
│  │    → Transform flowers (translate, rotate, scale)         │    │
│  │    → Assemble final SVG                                   │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ 5. Save to ./generated_svg/bouquet_xxx_timestamp.svg     │    │
│  └──────────────────────────────────────────────────────────┘    │
└─────────────────────────────┬────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                        API RESPONSE                               │
│  { ok: true, filename: "bouquet_januari_april_augustus_xxx.svg" } │
└──────────────────────────────────────────────────────────────────┘
```

---

This covers every function, constant, and the complete logic flow of the bouquet generator.
