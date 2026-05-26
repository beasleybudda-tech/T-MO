# T-MO Bot — Admin Blueprint

**For:** Server Admins · **Bot:** T-MO · **Server:** Car-club / GTA V RP

---

## 1. What's New This Release

### ⛽ Gas System
Cars now need fuel. Four economy commands (`/chopshop`, `/crime`, `/rob`, `/robbery`) burn **1 unit of gas per attempt**. Empty tank = command blocked until refueled.

- **Tank size:** 10 units (per player)
- **Refuel cost:** Flat **$500** for a full tank
- **New players:** Start with a full tank (no one gets locked out on rollout)

### 🛢️ /siphon — New Car-Crime Command
Steal fuel from another player's car. Risky.

- 55% base success rate
- Steal up to **3 units** per attempt
- **Bust penalty:** $750 fine + 45 min jail
- 90-minute cooldown
- Cannot siphon yourself, bots, empty tanks, or while your own tank is full

### 🔘 One-Click Refuel Button
A green **⛽ Refuel ($500)** button appears automatically on:
- Out-of-fuel error embeds (any car command)
- `/chopshop` bust embeds when the bust drained your tank
- `/gasstations check` when you're below full

Only the player who ran the original command can press the button.

---

## 2. How To Use The Gas System (Player Walkthrough)

**Step 1 — Check your fuel:**
```
/gasstations check
```
Shows a gauge like `[█████░░░░░] 5/10`.

**Step 2 — Browse stations (flavor only, all cost the same):**
```
/gasstations list
```

**Step 3 — Refuel when low:**
```
/gasstations refuel
```
Costs $500, fills tank to 10/10.

**Step 4 — Just play normally.** `/chopshop`, `/crime`, `/rob`, `/robbery` automatically burn 1 unit. If you run dry, the refuel button pops up — one click and you're back.

**Optional — Steal someone's gas:**
```
/siphon @username
```

---

## 3. Admin Notes

- **No setup required** — commands auto-register on bot startup.
- **No new database schema** — fuel is stored on the existing economy record (`userData.fuel`).
- **Backwards compatible** — existing players default to full tank.
- **Cooldowns are per-user, per-command** — same model as `/crime` and `/rob` already use.
- **Jail blocks all RP commands** — already enforced by existing code.

If a player complains "the bot took my money but I didn't refuel," check that they didn't click the refuel button — it charges immediately on press.

---

## 4. Full T-MO Economy + RP Command List

### 🏙️ GTA RP Commands (Core RP Loop)

| Command | What it does | Cooldown | Notes |
|---|---|---|---|
| `/chopshop` | Steal an NPC car, run it to the chop shop. Random car tier 1–5. | 45 min | **Burns 1 fuel.** Failure = fine + 1 hr jail |
| `/crime <type>` | Pickpocket / Burglary / Bank Heist / Art Theft / Cybercrime | 60 min | **Burns 1 fuel.** Failure = fine + 2 hr jail |
| `/robbery <target>` | Armed robbery: LTD / Liquor / 24-7 / Jewelry / Pacific Standard Bank | 90 min | **Burns 1 fuel.** Requires a weapon from `/shop`. Payout scales with gun tier |
| `/rob @user` | Mug another player. Personal Safe (from `/shop`) blocks attempts. | 4 hr | **Burns 1 fuel.** Steals 15% of victim's wallet on success |
| `/lscm list` | Browse Los Santos Customs car catalog | — | Cars: Sultan, Buffalo, Tornado, Dominator, Tailgater, Banshee, Infernus, Adder, Zentorno |
| `/lscm buy <car>` | Buy a car (e.g. `/lscm buy sultan`) | — | Price range $10k–$220k |
| `/lscm garage` | View cars you own | — | — |
| `/lscm sell <car>` | Sell a car back to LSCM at resale rate (60–75%) | — | — |
| `/gasstations list` | Show all 7 RP gas stations | — | LTD, Globe Oil, RON, Xero |
| `/gasstations check` | Show your current fuel gauge | — | Shows refuel button if below full |
| `/gasstations refuel` | Fill tank to 10/10 | — | Flat $500 |
| `/siphon @user` | Steal up to 3 fuel from another player | 90 min | Bust = $750 + 45 min jail |
| `/wanted` | Show your wanted level / heat (fun command) | — | — |

### 💰 General Economy

| Command | What it does | Cooldown |
|---|---|---|
| `/balance [@user]` | Show wallet + bank balance | — |
| `/daily` | Claim daily cash reward | 24 hr |
| `/work` | Pick up a shift for cash | 30 min |
| `/beg` | Beg for small change | 30 min |
| `/fish` | Go fishing | 45 min |
| `/mine` | Go mining | 60 min |
| `/slut` | Risky NSFW-themed job (random payout or loss) | 45 min |
| `/gamble <amount>` | Coin-flip gamble | 5 min |
| `/pay @user <amount>` | Transfer cash to another player | — |
| `/deposit <amount\|all>` | Move cash wallet → bank | — |
| `/withdraw <amount>` | Move cash bank → wallet | — |
| `/eleaderboard` | Top 10 richest players in the server | — |
| `/inventory` | View your items, weapons, garage cars | — |
| `/shop` (`browse`) | Browse the in-game shop | — |
| `/shop config setrole` | **(Admin)** Set Discord role granted by Premium Role item | — |
| `/buy <item_id> [qty]` | Purchase a shop item | — |

---

## 5. Quick Reference — RP Money Flow

```
EARN              SPEND                 RISK
─────             ─────                 ────
/daily            /lscm buy             /chopshop  → jail 1hr
/work             /gasstations refuel   /crime     → jail 2hr
/fish /mine       /buy (shop items)     /robbery   → jail 2hr
/chopshop         /pay @user            /rob       → cooldown 4hr
/crime                                  /siphon    → jail 45m
/robbery
/rob
/siphon (fuel)
```

Empty tank? `/gasstations refuel` or hit the green ⛽ button.
In jail? Wait it out — no RP commands work until you're released.

---

*Generated for the T-MO Discord bot · github.com/beasleybudda-tech/T-MO*
