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

**Requirements:** Home Assistant 2024.1+ and the Maytronics Dolphin BLE integration (v0.7.3+ recommended for **Working status** sensor).

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



