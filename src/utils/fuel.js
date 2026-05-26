import { createError, ErrorTypes } from './errorHandler.js';

// Gas/fuel system for car-related RP commands.
// Fuel is stored per-user on the economy record (userData.fuel) and represents
// units of gas in the player's currently-driven car. Tank capacity is fixed.

export const TANK_CAPACITY = 10;          // units in a full tank
export const REFUEL_COST = 500;            // flat cost to fill up
export const FUEL_PER_COMMAND = 1;         // units burned per car-related command

// Gas station catalog — RP flavor only, all stations charge the flat REFUEL_COST.
export const GAS_STATIONS = [
    { id: 'ltd_strawberry',   name: 'LTD Gasoline — Strawberry',         area: 'Strawberry'  },
    { id: 'ltd_grove',        name: 'LTD Gasoline — Grove Street',       area: 'Davis'       },
    { id: 'globe_oil_vinewd', name: 'Globe Oil — Vinewood Blvd',         area: 'Vinewood'    },
    { id: 'ron_grapeseed',    name: 'RON — Grapeseed',                   area: 'Grapeseed'   },
    { id: 'xero_paleto',      name: 'Xero Gas — Paleto Bay',             area: 'Paleto Bay'  },
    { id: 'ron_sandy',        name: 'RON — Sandy Shores Airfield',       area: 'Sandy Shores'},
    { id: 'globe_lsia',       name: 'Globe Oil — LSIA Service Road',     area: 'LSIA'        },
];

/**
 * Get the current fuel level for a user, treating undefined as a full tank for
 * brand-new players (so existing users don't get instantly locked out on rollout).
 */
export function getFuel(userData) {
    if (typeof userData.fuel !== 'number') {
        return TANK_CAPACITY;
    }
    return Math.max(0, Math.min(TANK_CAPACITY, userData.fuel));
}

/**
 * Returns a visual fuel gauge string, e.g. `[█████░░░░░] 5/10`.
 */
export function fuelGauge(level) {
    const safe = Math.max(0, Math.min(TANK_CAPACITY, level));
    const filled = '█'.repeat(safe);
    const empty = '░'.repeat(TANK_CAPACITY - safe);
    return `\`[${filled}${empty}]\` **${safe}/${TANK_CAPACITY}**`;
}

/**
 * Returns true if the user has enough fuel for one car-related command.
 * Use this when you want to render a custom out-of-fuel embed (e.g. with a
 * refuel button) instead of letting requireFuel() throw.
 */
export function hasFuel(userData) {
    return getFuel(userData) >= FUEL_PER_COMMAND;
}

/**
 * Throws a VALIDATION error if the user does not have enough fuel to run the
 * given car-related command. Does NOT consume fuel — call consumeFuel() after
 * the command logic succeeds (or unconditionally, your call). Prefer hasFuel()
 * + a custom embed when you want to attach a refuel button.
 */
export function requireFuel(userData, commandLabel = 'this') {
    const fuel = getFuel(userData);
    if (fuel < FUEL_PER_COMMAND) {
        throw createError(
            'Out of fuel',
            ErrorTypes.VALIDATION,
            `⛽ Your tank is empty. Hit \`/gasstations refuel\` before running ${commandLabel}.`,
            { fuel }
        );
    }
    return fuel;
}

/**
 * Helper that builds the standard "out of fuel" embed body. Pair with
 * buildRefuelRow() from interactions/buttons/refuel.js for a one-click refuel.
 */
export function outOfFuelMessage(commandLabel) {
    return `⛽ Your tank is empty. Hit \`/gasstations refuel\` (or use the button below) before running ${commandLabel}.`;
}

/**
 * Burn fuel on userData (mutates). Returns the new fuel level.
 */
export function consumeFuel(userData, units = FUEL_PER_COMMAND) {
    const current = getFuel(userData);
    const next = Math.max(0, current - units);
    userData.fuel = next;
    return next;
}

/**
 * Fill the tank to full. Returns { previous, filled, cost } so the caller can
 * craft a nice receipt. Throws if the user can't afford it.
 */
export function refuelTank(userData) {
    const wallet = userData.wallet || 0;
    if (wallet < REFUEL_COST) {
        throw createError(
            'Broke at the pump',
            ErrorTypes.VALIDATION,
            `Refueling costs **$${REFUEL_COST.toLocaleString()}**, you only have **$${wallet.toLocaleString()}** on hand.`
        );
    }

    const previous = getFuel(userData);
    if (previous >= TANK_CAPACITY) {
        throw createError(
            'Tank already full',
            ErrorTypes.VALIDATION,
            `Your tank is already full (${TANK_CAPACITY}/${TANK_CAPACITY}). Save your money.`
        );
    }

    userData.wallet = wallet - REFUEL_COST;
    userData.fuel = TANK_CAPACITY;

    return { previous, filled: TANK_CAPACITY - previous, cost: REFUEL_COST };
}
