# Pool Cleaner Card

Lovelace card for the **[Maytronics Dolphin](https://github.com/randrcomputers/ha-maytronics-dolphin)** integration — power toggle, status, BLE icon, optional blue LED pulse on your robot artwork, and PSU button ring — using images from **`/local/`**.

## Previews

| Cleaner (cleaning) | Power supply / idle |
| :---: | :---: |
<img width="503" height="309" alt="image" src="https://github.com/user-attachments/assets/af260690-9505-4cb9-8bd0-2b188135e3a0" />

<img width="500" height="636" alt="image" src="https://github.com/user-attachments/assets/6dde1e73-f53f-4eb6-804a-43824e396cd6" />

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

The card can drive a **simple HA schedule**: pick **days**, one or two **start times**, and **1 h / 2 h** run length. Home Assistant turns the cleaner **on**, waits, then **off**.

### Recommended: integration schedule (Dolphin v1.15.0+)

If the **Maytronics Dolphin** integration is **v1.15.0+** and the card has your **Dolphin device** selected:

1. Enable **Show schedule panel** on the card.
2. Leave **Schedule backend** on **Auto** (default).
3. **No YAML package required** — schedule is stored in the integration.

**Run 1** and **Run 2** each have their own **Days** row (e.g. weekdays for morning run, weekends for afternoon).

During an active timed run (schedule fire or **Run 1h / 2h Now**), the card shows a quiet line under the status pill (needs Dolphin **v1.17.2+**), for example:

`Started 8:02 AM · 1h 12m left`

Manual **Power** uses the PS **Cycle time** (1h / 2h select) for the same countdown line. Timed schedule / Run Now still use their own durations.

Update integration + card, reload resources (**Ctrl+F5**). Optional: remove or disable old `pool-cleaner-schedule.yaml` automations so only one scheduler runs.

### Legacy: YAML helpers + automations

Use this if you prefer explicit automations or run an older integration. Set card **Schedule backend** to **helpers** and map the helper entities.

**Important (legacy path):** The card only edits **helpers**. You must install the **script + automation** below.

### What to install (legacy YAML package)

Copy **`examples/pool-cleaner-schedule.yaml`** to  
`config/packages/pool-cleaner-schedule.yaml`

That file creates everything the card expects:

| Type | Entity | Purpose |
| --- | --- | --- |
| Helper | `input_boolean.pool_cleaner_schedule_enabled` | Master schedule on/off |
| Helper | `input_datetime.pool_cleaner_schedule_time` | **Run 1** start time |
| Helper | `input_select.pool_cleaner_schedule_duration` | **Run 1** duration (`1 hour` / `2 hours`) |
| Helper | `input_boolean.pool_cleaner_schedule_2_enabled` | **Run 2** on/off |
| Helper | `input_datetime.pool_cleaner_schedule_time_2` | **Run 2** start time |
| Helper | `input_select.pool_cleaner_schedule_duration_2` | **Run 2** duration |
| Helper | `input_text.pool_cleaner_schedule_days` | Shared weekdays `0`–`6` (Mon–Sun) |
| Script | `script.pool_cleaner_timed_run` | Power on → delay → power off |
| Automation | `automation.pool_cleaner_scheduled_run` | Fires at **run 1** time |
| Automation | `automation.pool_cleaner_scheduled_run_2` | Fires at **run 2** time (when run 2 enabled) |

`configuration.yaml` must load packages:

```yaml
homeassistant:
  packages: !include_dir_named packages
```

### One-time setup

1. Copy **`examples/pool-cleaner-schedule.yaml`** → `config/packages/pool-cleaner-schedule.yaml`.
2. In that file, set **`power:`** in **both** automations to your Dolphin **Power** switch, e.g. `switch.triton_ps_plus_power`.
3. **Developer tools → YAML → Reload** input helpers, scripts, and automations (or restart HA).
4. Edit the **Pool Cleaner Card** → enable **Show schedule panel** and map the schedule entities + script (see table above). Map the three **run 2** entities to show a second daily time on the card.
5. Reload dashboard resources (**Ctrl+F5**).

**Do not** create only the helpers in the UI — you still need **`script.pool_cleaner_timed_run`** and the **automations** from the example (or equivalent YAML).

**Already on run 1 only?** Merge the new helpers and **`pool_cleaner_scheduled_run_2`** automation from `examples/pool-cleaner-schedule.yaml`, reload YAML, then map the three run 2 entities in the card editor.

See also **`examples/dashboard-card-with-schedule.yaml`** for a full card YAML snippet.

### On the card

| Control | What it does |
| --- | --- |
| **Schedule** (collapsed) | Shows **On · 8:09 & 17:00** when both runs are enabled |
| **Enable** | Master on/off for all scheduled runs |
| **Run 1 / Run 2** | Each has **Start**, **1 h / 2 h**, and (run 2) its own **On** toggle |
| **Days** | Shared M–S toggles for both runs |
| **Run 1 h / Run 2 h (Now)** | Start immediately; auto-off after duration |

### How repeats work (no daily reset)

There is **nothing to reset** each night. Each enabled run fires **once per day** when **all** of these are true:

1. Clock matches that run’s **Start** time — checked every minute (no automation reload when you change time).
2. Master **Enable** is **On** (and **Run 2 → On** for the second slot).
3. **Today** is one of the selected **Days**.

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


