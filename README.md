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

### One-time setup

1. Copy **`examples/pool-cleaner-schedule.yaml`** into your HA config (or merge into `configuration.yaml`).
2. Replace **`switch.YOUR_POWER_SWITCH`** in the automation with your Dolphin **Power** entity.
3. **Developer tools → YAML → Reload** input helpers, scripts, and automations (or restart HA).
4. Edit the **Pool Cleaner Card** → enable **Show schedule panel** and map:
   - `input_boolean.pool_cleaner_schedule_enabled`
   - `input_datetime.pool_cleaner_schedule_time`
   - `input_select.pool_cleaner_schedule_duration`
   - `input_text.pool_cleaner_schedule_days`
   - `script.pool_cleaner_timed_run`
5. Reload dashboard resources (**Ctrl+F5**).

### On the card

| Control | What it does |
| --- | --- |
| **Schedule On/Off** | Enables the daily automation |
| **Start** | Time of day to start (local time) |
| **Run 1 h / 2 h** | How long power stays on before auto-off |
| **Days** | M–S toggles (0=Monday … 6=Sunday) |
| **Run 1 h / Run 2 h (Now)** | Start immediately; auto-off after duration |

Scheduling runs **in Home Assistant** (automation + script), so it works even when nobody has the dashboard open.


