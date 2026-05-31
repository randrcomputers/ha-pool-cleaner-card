# Pool Cleaner Card

Lovelace card for the **[Maytronics Dolphin](https://github.com/randrcomputers/ha-maytronics-dolphin)** integration — power toggle, status, BLE icon, optional blue LED pulse on your robot artwork, and PSU button ring — using images from **`/local/`**.

## Previews

| Cleaner (cleaning) | Power supply / idle |
| :---: | :---: |
| ![Cleaner preview](media/preview-cleaner.gif) | ![Power supply preview](media/preview-power-supply.gif) |

Your own card images (`robot` / `psu` URLs in the editor) can be **PNG, JPEG, WebP**, or **GIF** if you prefer.

## Install

1. **HACS** → **Frontend** → **Custom repositories** → add `https://github.com/randrcomputers/ha-pool-cleaner-card`
2. **Frontend** → **Pool Cleaner Card** → **Download**
3. **Settings** → **Dashboards** → **⋮** → **Reload resources**, then refresh the browser (**Ctrl+F5**)

## Pictures on Home Assistant

Optional artwork shipped in this repo: copy the files from **`pool_card/`** into **`config/www/pool_card/`** on Home Assistant.

| File to copy (`pool_card/` → `www/pool_card/`) | Example URL |
| --- | --- |
| `robot_triton_front.png` | `/local/pool_card/robot_triton_front.png` |
| `psu_front.png` | `/local/pool_card/psu_front.png` |

Enter those URLs in **Robot image URL** / **Power supply image URL**, or YAML:

```yaml
type: custom:pool-cleaner-card
device: YOUR_DEVICE_ID
image_robot: /local/pool_card/robot_triton_front.png
image_psu: /local/pool_card/psu_front.png
```

Use your own images if you prefer (PNG, JPEG, WebP, or GIF paths work).
Use the UI and pick your **Dolphin device**, or YAML:

```yaml
type: custom:pool-cleaner-card
device: YOUR_DEVICE_ID
```

---

**Requirements:** Home Assistant 2024.1+ and the Maytronics Dolphin BLE integration (**v0.7.4+** for reliable **Working status** on models where `fffc` GetStatus is empty).

### Card entity wiring

| Field | Use |
| --- | --- |
| **Dolphin device** | Recommended — auto-fills Power, Cleaner state, Working status |
| **Cleaner state** | Keep as **Cleaner state** (do not swap for Clean program) |
| **Working status** | Leave empty if device is set; card needs `at_work` / `finished` (v0.7.4 infers this when GetStatus is missing) |
| **Cleaning active** | Optional — ignored for the status pill (too broad after a cycle) |
| **Clean program** | Not used by this card |

## Status pill (not just “power on”)

The card uses **Cleaner state** plus **Working status** (from the integration’s `GetStatusRead` poll, or the `working_status` attribute on **Cleaning surface**):

| What you see | Meaning |
| --- | --- |
| **Cleaning** | Robot reports `at_work` — bubbles, robot image, green pulsing dot |
| **Done cleaning** | Cycle finished (`finished`) or cleaner state **hold** |
| **Powered on** | Power/PS still on but not actively cleaning (avoids false “Running”) |
| **Off** | Cleaner state off |
| **Programming** / **Self test** / **Fault** | Matching robot modes |

Power button still reflects the **Power** switch. Robot artwork and LED overlay only appear while status is **Cleaning** (unless you set *Robot vs power supply image* to Always/Never in card options).

## Schedule (Home Assistant — not the phone app)

The card can drive a **simple HA schedule**: pick **days**, **start time**, and **1 h / 2 h** run length. Home Assistant turns the cleaner **on**, waits, then **off** — no MyDolphin APK schedule needed.

**Important:** The card only edits **helpers**. It does **not** run the schedule by itself. You must install the **script + automation** below (or the scheduled time will never fire).

### What to install (one YAML package)

Copy **`examples/pool-cleaner-schedule.yaml`** to  
`config/packages/pool-cleaner-schedule.yaml`

That file creates everything the card expects:

| Type | Entity | Purpose |
| --- | --- | --- |
| Helper | `input_boolean.pool_cleaner_schedule_enabled` | Schedule on/off (card toggle) |
| Helper | `input_datetime.pool_cleaner_schedule_time` | Daily start time |
| Helper | `input_select.pool_cleaner_schedule_duration` | `1 hour` or `2 hours` |
| Helper | `input_text.pool_cleaner_schedule_days` | Weekdays `0`–`6` (Mon–Sun), comma-separated |
| Script | `script.pool_cleaner_timed_run` | Power on → delay → power off |
| Automation | `automation.pool_cleaner_scheduled_run` | Fires at start time on selected days |

`configuration.yaml` must load packages:

```yaml
homeassistant:
  packages: !include_dir_named packages
```

### One-time setup

1. Copy **`examples/pool-cleaner-schedule.yaml`** → `config/packages/pool-cleaner-schedule.yaml`.
2. In that file, set **`power:`** (automation `variables` block) to your Dolphin **Power** switch, e.g. `switch.triton_ps_plus_power`.
3. **Developer tools → YAML → Reload** input helpers, scripts, and automations (or restart HA).
4. Edit the **Pool Cleaner Card** → enable **Show schedule panel** and map all five entities + the script (see table above).
5. Reload dashboard resources (**Ctrl+F5**).

**Do not** create only the helpers in the UI — you still need **`script.pool_cleaner_timed_run`** and **`automation.pool_cleaner_scheduled_run`** from the example (or equivalent YAML).

See also **`examples/dashboard-card-with-schedule.yaml`** for a full card YAML snippet.

### On the card

| Control | What it does |
| --- | --- |
| **Schedule On/Off** | Enables the daily automation |
| **Start** | Time of day to start (local time) |
| **Run 1 h / 2 h** | How long power stays on before auto-off |
| **Days** | M–S toggles (0=Monday … 6=Sunday) |
| **Run 1 h / Run 2 h (Now)** | Start immediately; auto-off after duration |

### How repeats work (no daily reset)

There is **nothing to reset** each night. The automation runs **once per day** when **all** of these are true:

1. Clock matches **Start** (`input_datetime.pool_cleaner_schedule_time`) — checked every minute.
2. **Schedule** toggle is **On**.
3. **Today** is one of the day chips you selected (`0` = Mon … `6` = Sun).

Tomorrow at the same time, the same checks run again automatically. You only change helpers on the card; no cron job or manual reload for the next day.

Leave the **automation enabled** in Settings → Automations and keep **Home Assistant running** at the scheduled time.

### Changing start time (no automation reload)

The example automation uses a **once-per-minute** trigger and compares the clock to the helper. When you change **Start** on the card, the new time applies on the **next** matching minute — you do **not** need Developer tools → Reload automations.

(Older setups used `trigger: time` + `at: input_datetime…`; that pattern often requires a reload after each time change — update your package from `examples/pool-cleaner-schedule.yaml` if you still have that.)

Scheduling runs **in Home Assistant** (automation + script), so it works even when nobody has the dashboard open.

### Troubleshooting (schedule did not run)

The card only updates helpers. **Home Assistant** must run automation `pool_cleaner_scheduled_run` at the start time.

#### Quick checks (Developer tools → States)

| Entity | What you need |
| --- | --- |
| `input_boolean.pool_cleaner_schedule_enabled` | **on** (card “Schedule” toggle) |
| `input_datetime.pool_cleaner_schedule_time` | Matches your start time (time only) |
| `input_text.pool_cleaner_schedule_days` | Contains today’s weekday as a number: **0=Mon … 6=Sun** (e.g. Wednesday → `2` in `0,1,2,3,4`) |
| `input_select.pool_cleaner_schedule_duration` | `1 hour` or `2 hours` |
| `automation.pool_cleaner_scheduled_run` | **on** (not disabled) |
| `script.pool_cleaner_timed_run` | Exists (no `unavailable`) |

**Today’s weekday in HA:** Developer tools → **Template** → `{{ now().weekday() }}` (0=Monday, 6=Sunday). That number must appear in `input_text.pool_cleaner_schedule_days`.

#### Does “Run 1 h / Run 2 h (Now)” work?

| Result | Likely cause |
| --- | --- |
| **Now works, time does not** | Automation missing, disabled, wrong time entity, wrong day, or schedule toggle off |
| **Now also fails** | Script wrong, or card **Power** / `power_entity` in script does not match `switch.triton_ps_plus_power` (edit YAML line 65) |
| **Nothing in log at start time** | Package not loaded — see below |

#### Verify package is loaded

`configuration.yaml` must include:

```yaml
homeassistant:
  packages: !include_dir_named packages
```

File must live at e.g. `config/packages/pool-cleaner-schedule.yaml` (same content as `examples/pool-cleaner-schedule.yaml`).

After edits: **Developer tools → YAML** → reload **Input helpers**, **Scripts**, and **Automations** (or restart HA).

#### Trace the automation

**Settings → Automations & scenes → Pool cleaner scheduled start → Traces**

- No trace at the scheduled minute → trigger never fired (time entity, HA not running, or automation disabled).
- Trace **failed conditions** → usually schedule **Off**, wrong **day**, or empty `pool_cleaner_schedule_days`.
- Trace timeline says **“Stopped because only a single execution is allowed”** → automation **mode** is `single` while a run is still active (often after **Run Now** or during the 1–2 h script delay). Set **mode: restart** on the automation.
- Trace **ran** but robot did not start → check script trace; fix **power** entity in the automation `variables:` block.

#### Test without waiting

1. Set start time to **2–3 minutes from now**.
2. Enable schedule, include **today** on day chips.
3. Watch **Settings → Automations → Traces** at that minute.

Or run manually: **Developer tools → Actions** → `script.pool_cleaner_timed_run` with:

```yaml
power_entity: switch.triton_ps_plus_power
duration_minutes: 1
```

(Use your real power entity_id.)


