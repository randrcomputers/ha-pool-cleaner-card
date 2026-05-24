# Pool Light Card

Lovelace card for any **RGB `light`** entity — fixture artwork, color presets, brightness slider, power toggle, and a BLE-style connectivity badge (same look as the [Pool Cleaner Card](https://github.com/randrcomputers/ha-pool-cleaner-card)).

Works with **[iPool Light](https://github.com/randrcomputers/ha-ipool-light)** (**v0.1.3+** for the effect dropdown). Other RGB lights can use colors only.

### Effect dropdown (iPool / LedBle)

Requires integration **v0.1.3** (`ipool_light.set_rgb_effect` service). The card shows a dropdown (jump, gradient, flash) like the iPool app — **no extra HA entities**, so it does not break the light integration.

The built-in HA **light more-info** dialog (power / brightness / color wheel) does not include effects; use this card on your dashboard for animations.

When you pick an effect, the card can **animate the lens glow** on the fixture image (jump = stepped colors, gradient = hue sweep, flash = pulse). This is a **card-only preview** — Home Assistant does not report the lamp’s live effect mode, so after a page reload you may need to select the effect again to see the animation. Turn off **Animate lens glow when an effect is selected** in the card editor if you prefer a solid glow only.

![Pool light card preview](media/preview.png)

## Install

1. **HACS** → **Frontend** → **Custom repositories** → add `https://github.com/randrcomputers/ha-pool-light-card`
2. **Frontend** → **Pool Light Card** → **Download**
3. **Settings** → **Dashboards** → **⋮** → **Reload resources**, then refresh the browser (**Ctrl+F5**)

## Pictures on Home Assistant

Copy files from the repo folder **`pool_card/`** into **`config/www/pool_card/`** on your HA host.

| File to copy | Example URL |
| --- | --- |
| **`pool_light_fixture.png`** (fixture, light on) | `/local/pool_card/pool_light_fixture.png` |
| **`light_control_box.png`** (control box, light off) | `/local/pool_card/light_control_box.png` |
| **`ipool_light.png`** (your product photo) | `/local/pool_card/ipool_light.png` |

See **`pool_card/README.md`** for all bundled images.

If the colored glow does not line up with your lens, adjust **Lens glow — top / left / size %** in the card editor. If the color is hard to see when the light is on, raise **Lens glow — brightness %** (default **140**; try up to **200**).

## Add the card

Pick your **Light** entity in the UI, or YAML:

```yaml
type: custom:pool-light-card
entity: light.ipool_light
image: /local/pool_card/pool_light_fixture.png
image_control_box: /local/pool_card/light_control_box.png
show_fixture_when: auto
```

**Auto** shows the fixture while the light is on and the control box when off (like the pool cleaner robot / PSU swap).

Optional **Connected** binary sensor lights the BLE badge when `on`.

---

**Requirements:** Home Assistant 2024.1+ and a `light` entity with `rgb` color mode.
