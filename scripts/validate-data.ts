/**
 * Checks every building's indoor data: ids, references, and that each
 * destination can be reached from the default entrance. Exits non-zero on
 * errors so it can gate CI. Run with: npm run validate:data
 */
import { validateBuilding } from "../src/domain/routing";
import { INDOOR_BUILDING_IDS, loadIndoorBuilding } from "../src/data/buildings";

async function main(): Promise<void> {
  let errors = 0;
  for (const id of INDOOR_BUILDING_IDS) {
    const { building } = await loadIndoorBuilding(id);
    const issues = validateBuilding(building);
    const destinations = building.units.filter((u) => u.ref !== null).length;
    console.log(`\n${id}: ${building.levels.length} levels, ${building.units.length} units (${destinations} numbered), ${building.walkways.length} walkways`);
    for (const issue of issues) {
      console.log(`  ${issue.severity.toUpperCase()} ${issue.code}: ${issue.message}`);
      if (issue.severity === "error") errors++;
    }
    if (issues.length === 0) console.log("  ok");
  }
  if (errors > 0) {
    console.error(`\n${errors} error(s) found.`);
    process.exit(1);
  }
}

void main();
