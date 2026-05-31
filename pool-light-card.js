/**
 * Pool Light Card — Home Assistant Lovelace (RGB light + optional BLE badge).
 */
(function () {
  const LitElement = Object.getPrototypeOf(customElements.get("ha-panel-lovelace"));
  const { html, css } = LitElement.prototype;

  const DEFAULTS = Object.freeze({
    image: "/local/pool_card/pool_light_fixture.png",
    image_control_box: "/local/pool_card/light_control_box.png",
    show_fixture_when: "auto",
    glow_top: 22,
    glow_left: 22,
    glow_size: 56,
    glow_brightness: 140,
  });

  /** Must match ``ipool_light`` service ``effect`` names (APK ``rgb_mode`` 128–156). */
  const EFFECT_OPTIONS = Object.freeze([
    { group: "Jump", items: ["Tricolor jump", "Seven-color jump"] },
    {
      group: "Gradient",
      items: [
        "Seven-color gradient",
        "Tricolor gradient",
        "Red gradient",
        "Green gradient",
        "Blue gradient",
        "Yellow gradient",
        "Cyan gradient",
        "Purple gradient",
        "White gradient",
        "Red-Green gradient",
        "Red-Blue gradient",
        "Green-Blue gradient",
      ],
    },
    {
      group: "Flash",
      items: [
        "Seven-color flash",
        "Red flash",
        "Green flash",
        "Blue flash",
        "Yellow flash",
        "Cyan flash",
        "Purple flash",
        "White flash",
      ],
    },
    {
      group: "Static (effect mode)",
      items: [
        "Static white",
        "Static red",
        "Static blue",
        "Static green",
        "Static cyan",
        "Static yellow",
        "Static purple",
      ],
    },
  ]);

  const PRESETS = Object.freeze([
    { name: "Orange", rgb: [255, 120, 40] },
    { name: "Peach", rgb: [255, 190, 140] },
    { name: "Warm white", rgb: [255, 235, 200] },
    { name: "White", rgb: [255, 255, 255] },
    { name: "Sky", rgb: [120, 190, 255] },
    { name: "Lavender", rgb: [190, 160, 255] },
    { name: "Pink", rgb: [255, 170, 200] },
    { name: "Coral", rgb: [255, 100, 90] },
  ]);

  const STATIC_EFFECT_RGB = Object.freeze({
    "Static red": [255, 48, 48],
    "Static blue": [48, 120, 255],
    "Static green": [48, 220, 96],
    "Static cyan": [48, 220, 255],
    "Static yellow": [255, 230, 80],
    "Static purple": [180, 96, 255],
    "Static white": [255, 255, 255],
  });

  /** Card lens preview — matched to APK effect families (not HA state). */
  const EFFECT_PREVIEW = Object.freeze({
    "Tricolor jump": { fx: "fx-jump-tri", rgb: null },
    "Seven-color jump": { fx: "fx-jump-seven", rgb: null },
    "Tricolor gradient": { fx: "fx-jump-tri", rgb: null },
    "Seven-color gradient": { fx: "fx-jump-seven", rgb: null },
    "Red gradient": { fx: "fx-gradient-mono", rgb: [255, 72, 48] },
    "Green gradient": { fx: "fx-gradient-mono", rgb: [48, 220, 120] },
    "Blue gradient": { fx: "fx-gradient-mono", rgb: [48, 140, 255] },
    "Yellow gradient": { fx: "fx-gradient-mono", rgb: [255, 210, 64] },
    "Cyan gradient": { fx: "fx-gradient-mono", rgb: [64, 210, 255] },
    "Purple gradient": { fx: "fx-gradient-mono", rgb: [170, 96, 255] },
    "White gradient": { fx: "fx-gradient-mono", rgb: [240, 240, 255] },
    "Red-Green gradient": { fx: "fx-gradient-rg", rgb: null },
    "Red-Blue gradient": { fx: "fx-gradient-rb", rgb: null },
    "Green-Blue gradient": { fx: "fx-gradient-gb", rgb: null },
    "Seven-color flash": { fx: "fx-jump-seven", rgb: null, flash: true },
    "Red flash": { fx: "fx-flash", rgb: [255, 56, 56] },
    "Green flash": { fx: "fx-flash", rgb: [56, 255, 120] },
    "Blue flash": { fx: "fx-flash", rgb: [56, 140, 255] },
    "Yellow flash": { fx: "fx-flash", rgb: [255, 220, 64] },
    "Cyan flash": { fx: "fx-flash", rgb: [64, 220, 255] },
    "Purple flash": { fx: "fx-flash", rgb: [180, 96, 255] },
    "White flash": { fx: "fx-flash", rgb: [255, 255, 255] },
  });

  const FX_DURATION_BASE_SEC = Object.freeze({
    "fx-jump-tri": 1.05,
    "fx-jump-seven": 1.75,
    "fx-gradient-mono": 2.8,
    "fx-gradient-rg": 2.4,
    "fx-gradient-rb": 2.4,
    "fx-gradient-gb": 2.4,
    "fx-flash": 0.32,
  });

  const MONO_GRADIENT_RGB = Object.freeze({
    red: [255, 72, 48],
    green: [48, 220, 120],
    blue: [48, 140, 255],
    yellow: [255, 210, 64],
    cyan: [64, 210, 255],
    purple: [170, 96, 255],
    white: [240, 240, 255],
  });

  const ATTR_IPOOL_EFFECT = "ipool_effect";
  const ATTR_IPOOL_EFFECT_SPEED = "ipool_effect_speed";
  const DEFAULT_EFFECT_SPEED = 3;

  function effectStorageKey(entityId) {
    return `pool-light-card:${entityId}:effect`;
  }

  function readStoredEffect(entityId) {
    if (!entityId) return "";
    try {
      return localStorage.getItem(effectStorageKey(entityId)) || "";
    } catch {
      return "";
    }
  }

  function writeStoredEffect(entityId, effect) {
    if (!entityId) return;
    try {
      const key = effectStorageKey(entityId);
      if (effect) localStorage.setItem(key, effect);
      else localStorage.removeItem(key);
    } catch {
      /* private mode / quota */
    }
  }

  function resolveEffectName(hass, entityId, stEffect) {
    if (
      stEffect &&
      stEffect !== "unknown" &&
      stEffect !== "unavailable"
    ) {
      return String(stEffect);
    }
    return readStoredEffect(entityId);
  }

  function num(config, key, fallback) {
    const v = config[key];
    if (v === undefined || v === null || v === "") return fallback;
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  function mergeConfig(config) {
    return {
      ...DEFAULTS,
      show_fixture_when: "auto",
      show_effects: true,
      show_effect_preview: true,
      ...config,
    };
  }

  function showFixtureView(config, light) {
    const mode = config.show_fixture_when || "auto";
    if (mode === "always") return true;
    if (mode === "never") return false;
    return light.isOn;
  }

  function resolveArtwork(config, light) {
    const ctrl = (config.image_control_box || "").trim();
    const fixture = showFixtureView(config, light);
    if (!fixture && ctrl) {
      return { src: ctrl, showGlow: false, view: "control-box" };
    }
    return {
      src: config.image || DEFAULTS.image,
      showGlow: true,
      view: "fixture",
    };
  }

  function glowStrengthMul(config) {
    const b = num(config, "glow_brightness", DEFAULTS.glow_brightness);
    return Math.min(2.5, Math.max(0.25, b / 100));
  }

  function glowRadial(rgb, strength) {
    const [r, g, b] = rgb;
    const a0 = Math.min(1, 0.95 * strength).toFixed(2);
    const a1 = Math.min(1, 0.6 * strength).toFixed(2);
    const a2 = Math.min(1, 0.22 * strength).toFixed(2);
    return `radial-gradient(circle at 45% 40%, rgba(${r},${g},${b},${a0}) 0%, rgba(${r},${g},${b},${a1}) 38%, rgba(${r},${g},${b},${a2}) 62%, transparent 72%)`;
  }

  /**
   * Card-only: stretch the slow end of the slider so preview 1–3 match the lamp better.
   * Speed 10 stays the same as the old linear ``/ sp`` mapping.
   */
  function fxPreviewPaceDiv(sp) {
    const s = Math.max(1, Math.min(10, Number(sp) || DEFAULT_EFFECT_SPEED));
    const wire = (s - 1) / 9;
    return s * (0.32 + wire * 0.68);
  }

  function fxDurationSec(fxClass, effectSpeed, flashFast) {
    const sp = Math.max(1, Math.min(10, Number(effectSpeed) || DEFAULT_EFFECT_SPEED));
    const base = FX_DURATION_BASE_SEC[fxClass] || 3;
    const flashMul = flashFast ? 0.55 : 1;
    return (
      (base * flashMul * DEFAULT_EFFECT_SPEED) /
      fxPreviewPaceDiv(sp)
    ).toFixed(2);
  }

  function glowStyle(config, rgb, brightness, isOn, fxClass, effectSpeed, flashFast) {
    const [r, g, b] = rgb;
    const top = num(config, "glow_top", DEFAULTS.glow_top);
    const left = num(config, "glow_left", DEFAULTS.glow_left);
    const size = num(config, "glow_size", DEFAULTS.glow_size);
    const strength = glowStrengthMul(config);
    const lightDim = isOn ? (brightness || 255) / 255 : 0;
    const dim = isOn ? Math.min(1, Math.max(0.2, lightDim * strength)) : 0;
    const dur = fxDurationSec(fxClass, effectSpeed, flashFast);
    return `
      --pl-glow-top:${top}%;
      --pl-glow-left:${left}%;
      --pl-glow-size:${size}%;
      --pl-glow-bg:${glowRadial(rgb, strength)};
      --pl-dim:${dim.toFixed(3)};
      --pl-glow-filter:brightness(${strength.toFixed(2)});
      --pl-glow-shadow:0 0 36px rgba(${r},${g},${b},${Math.min(1, 0.7 * strength).toFixed(2)});
      --pl-fx-duration:${dur}s;
    `.trim();
  }

  /** Card-only preview — uses per-effect map (see ``EFFECT_PREVIEW``). */
  function effectPreview(effectName) {
    if (!effectName) {
      return { fx: "", rgb: [255, 255, 255], flashFast: false };
    }
    if (STATIC_EFFECT_RGB[effectName]) {
      return { fx: "", rgb: STATIC_EFFECT_RGB[effectName], flashFast: false };
    }
    const mapped = EFFECT_PREVIEW[effectName];
    if (mapped) {
      return {
        fx: mapped.fx,
        rgb: mapped.rgb || [255, 200, 120],
        flashFast: Boolean(mapped.flash),
      };
    }
    const n = effectName.toLowerCase();
    if (n.includes("jump")) {
      return {
        fx: n.includes("seven") ? "fx-jump-seven" : "fx-jump-tri",
        rgb: [255, 200, 120],
        flashFast: false,
      };
    }
    if (n.includes("flash")) {
      return {
        fx: n.includes("seven") ? "fx-jump-seven" : "fx-flash",
        rgb: [255, 255, 255],
        flashFast: n.includes("seven"),
      };
    }
    if (n.includes("gradient")) {
      if (n.includes("seven")) {
        return { fx: "fx-jump-seven", rgb: null, flashFast: false };
      }
      if (n.includes("tricolor")) {
        return { fx: "fx-jump-tri", rgb: null, flashFast: false };
      }
      if (n.includes("red") && n.includes("green")) {
        return { fx: "fx-gradient-rg", rgb: null, flashFast: false };
      }
      if (n.includes("red") && n.includes("blue")) {
        return { fx: "fx-gradient-rb", rgb: null, flashFast: false };
      }
      if (n.includes("green") && n.includes("blue")) {
        return { fx: "fx-gradient-gb", rgb: null, flashFast: false };
      }
      for (const [key, rgb] of Object.entries(MONO_GRADIENT_RGB)) {
        if (n.includes(key)) {
          return { fx: "fx-gradient-mono", rgb, flashFast: false };
        }
      }
      return { fx: "fx-gradient-mono", rgb: [255, 200, 120], flashFast: false };
    }
    return { fx: "", rgb: [255, 255, 255], flashFast: false };
  }

  function resolveGlowPreview(cfg, light, selectedEffect, effectSpeed) {
    const speed =
      effectSpeed != null
        ? Math.max(1, Math.min(10, Number(effectSpeed) || DEFAULT_EFFECT_SPEED))
        : light.effectSpeed;
    const on =
      light.isOn && selectedEffect && cfg.show_effect_preview !== false;
    if (!on) {
      return {
        rgb: light.rgb,
        fx: "",
        label: light.label,
        speed,
      };
    }
    const preview = effectPreview(selectedEffect);
    const rgb =
      preview.rgb ||
      (preview.fx === "fx-gradient-rg"
        ? [255, 72, 48]
        : preview.fx === "fx-gradient-rb"
          ? [255, 72, 48]
          : preview.fx === "fx-gradient-gb"
            ? [48, 220, 120]
            : light.rgb);
    const short =
      selectedEffect.length > 22
        ? `${selectedEffect.slice(0, 20)}…`
        : selectedEffect;
    return {
      rgb,
      fx: preview.fx,
      label: short,
      speed,
      flashFast: preview.flashFast,
    };
  }

  function readLight(hass, entityId) {
    const st = entityId && hass?.states?.[entityId];
    if (!st) {
      return {
        ok: false,
        isOn: false,
        rgb: [255, 255, 255],
        brightness: 255,
        label: "Unavailable",
        effect: "",
        effectSpeed: DEFAULT_EFFECT_SPEED,
      };
    }
    const isOn = st.state === "on";
    const rgb = Array.isArray(st.attributes?.rgb_color)
      ? st.attributes.rgb_color.map((n) => Math.round(Number(n)) || 0)
      : [255, 255, 255];
    const brightness =
      st.attributes?.brightness != null
        ? Math.min(255, Math.max(1, Number(st.attributes.brightness) || 255))
        : isOn
          ? 255
          : 0;
    const effectRaw = st.attributes?.[ATTR_IPOOL_EFFECT];
    const effect = resolveEffectName(hass, entityId, effectRaw);
    const effectSpeed = Math.max(
      1,
      Math.min(
        10,
        Number(st.attributes?.[ATTR_IPOOL_EFFECT_SPEED]) || DEFAULT_EFFECT_SPEED
      )
    );
    return {
      ok: true,
      isOn,
      rgb,
      brightness,
      label: isOn ? (effect || "On") : "Off",
      effect,
      effectSpeed,
    };
  }

  function bleConnected(hass, config) {
    if (config.entity_connected) {
      const st = hass.states[config.entity_connected];
      return st?.state === "on";
    }
    if (config.entity) {
      const st = hass.states[config.entity];
      return st && st.state !== "unavailable";
    }
    return false;
  }

  function rgbEqual(a, b) {
    return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
  }

  class PoolLightCard extends LitElement {
    static get properties() {
      return {
        hass: {},
        config: {},
        _busy: { state: false },
        _ipoolBusy: { state: false },
        _pendingLabel: { state: null },
        _selectedEffect: { state: "" },
        /** True when UI is on “Solid color (swatches)” — HA may still report ipool_effect. */
        _solidColorMode: { state: false },
        /** Live lens preview while dragging speed (HA state updates later). */
        _previewSpeed: { state: null },
      };
    }

    static getConfigElement() {
      return document.createElement("pool-light-card-editor");
    }

    static getStubConfig() {
      return { type: "custom:pool-light-card" };
    }

    getCardSize() {
      return 5;
    }

    setConfig(config) {
      this.config = mergeConfig(config || {});
    }

    _entityId() {
      return this.config?.entity;
    }

    async _call(service, data) {
      const entity_id = this._entityId();
      if (!entity_id || this._busy) return;
      this._busy = true;
      try {
        await this.hass.callService("light", service, {
          entity_id,
          ...data,
        });
      } finally {
        this._busy = false;
      }
    }

    async _callIpool(service, data, pendingLabel = "Sending…") {
      const entity_id = this._entityId();
      if (!entity_id || this._ipoolBusy) return;
      this._ipoolBusy = true;
      this._pendingLabel = pendingLabel;
      try {
        await this.hass.callService("ipool_light", service, {
          entity_id,
          ...data,
        });
        if (service === "set_rgb_effect" && data.effect) {
          writeStoredEffect(entity_id, data.effect);
        }
        if (service === "set_effect_speed") {
          const effect =
            readLight(this.hass, entity_id).effect ||
            this._selectedEffect ||
            readStoredEffect(entity_id);
          if (effect) writeStoredEffect(entity_id, effect);
        }
      } finally {
        this._ipoolBusy = false;
        this._pendingLabel = null;
      }
    }

    _pickEffect(ev) {
      const effect = ev.target.value;
      const entityId = this._entityId();
      this._selectedEffect = effect;
      if (!effect) {
        this._solidColorMode = true;
        writeStoredEffect(entityId, "");
        return;
      }
      this._solidColorMode = false;
      writeStoredEffect(entityId, effect);
      const short =
        effect.length > 18 ? `${effect.slice(0, 16)}…` : effect;
      this._callIpool(
        "set_rgb_effect",
        { effect, turn_on_first: true },
        `Applying: ${short}`
      );
    }

    firstUpdated() {
      const entityId = this._entityId();
      if (!entityId || !this.hass) return;
      const light = readLight(this.hass, entityId);
      const stored = readStoredEffect(entityId);
      if (light.effect || stored) {
        this._solidColorMode = false;
        this._selectedEffect = light.effect || stored;
      } else {
        this._solidColorMode = true;
        this._selectedEffect = "";
      }
    }

    updated(changedProperties) {
      if (changedProperties.has("hass") && this.hass) {
        const entityId = this._entityId();
        const light = readLight(this.hass, entityId);
        if (!this._solidColorMode) {
          const resolved =
            light.effect ||
            readStoredEffect(entityId) ||
            this._selectedEffect ||
            "";
          if (resolved !== (this._selectedEffect || "")) {
            this._selectedEffect = resolved;
          }
          if (light.effect) writeStoredEffect(entityId, light.effect);
        }
        if (
          this._previewSpeed != null &&
          light.effectSpeed === this._previewSpeed
        ) {
          this._previewSpeed = null;
        }
      }
      if (this._needGlowRestart) {
        this._needGlowRestart = false;
        queueMicrotask(() => this._restartLensGlow());
      }
    }

    _effectSpeedForUi(light) {
      const v = this._previewSpeed ?? light.effectSpeed;
      return Math.max(1, Math.min(10, Number(v) || DEFAULT_EFFECT_SPEED));
    }

    _restartLensGlow() {
      const el = this.shadowRoot?.querySelector(".lens-glow");
      if (!el || !el.className.includes("fx-")) return;
      el.style.animation = "none";
      void el.offsetHeight;
      el.style.removeProperty("animation");
    }

    _onEffectSpeedInput(ev) {
      const speed = Math.max(1, Math.min(10, Number(ev.target.value) || 1));
      this._previewSpeed = speed;
      this._needGlowRestart = true;
    }

    _setEffectSpeed(ev) {
      const speed = Math.max(1, Math.min(10, Number(ev.target.value) || 1));
      this._previewSpeed = speed;
      const entityId = this._entityId();
      const effect =
        readLight(this.hass, entityId).effect ||
        this._selectedEffect ||
        readStoredEffect(entityId);
      if (!effect) return;
      this._callIpool("set_effect_speed", { speed }, "Updating speed…");
    }

    _selectedEffectForUi(light, entityId) {
      return (
        light.effect ||
        readStoredEffect(entityId) ||
        this._selectedEffect ||
        ""
      );
    }

    _inEffectMode(light, entityId) {
      return Boolean(this._selectedEffectForUi(light, entityId));
    }

    _togglePower() {
      this._call("toggle", {});
    }

    _setBrightness(ev) {
      const brightness = Number(ev.target.value);
      const light = readLight(this.hass, this._entityId());
      if (light.isOn) {
        this._call("turn_on", { brightness });
      } else {
        this._call("turn_on", {
          rgb_color: light.rgb,
          brightness,
        });
      }
    }

    _pickColor(rgb) {
      const entityId = this._entityId();
      this._solidColorMode = true;
      this._selectedEffect = "";
      writeStoredEffect(entityId, "");
      const light = readLight(this.hass, entityId);
      this._call("turn_on", {
        rgb_color: rgb,
        brightness: light.isOn ? light.brightness : 255,
      });
    }

    _pickCustom(ev) {
      const hex = ev.target.value;
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      this._pickColor([r, g, b]);
    }

    render() {
      if (!this.hass || !this.config) return html``;

      const cfg = mergeConfig(this.config);
      const entityId = cfg.entity;

      if (!entityId) {
        return html`
          <ha-card>
            <div class="card setup-card">
              <p class="setup-msg">
                Choose a <strong>Light</strong> entity in the card options.
              </p>
            </div>
          </ha-card>
        `;
      }

      const light = readLight(this.hass, entityId);
      const solidColorMode = this._solidColorMode;
      const selectedEffect = solidColorMode
        ? ""
        : this._selectedEffectForUi(light, entityId);
      const inEffect = !solidColorMode && Boolean(selectedEffect);
      const title =
        cfg.name ||
        this.hass.states[entityId]?.attributes?.friendly_name ||
        "Pool light";
      const ble = bleConnected(this.hass, cfg);
      const art = resolveArtwork(cfg, light);
      const uiSpeed = this._effectSpeedForUi(light);
      const glowPreview = resolveGlowPreview(
        cfg,
        light,
        selectedEffect,
        uiSpeed
      );
      const [r, g, b] = glowPreview.rgb;
      const fxDur = fxDurationSec(
        glowPreview.fx,
        glowPreview.speed,
        glowPreview.flashFast
      );
      if (this._glowSpeedSeen !== uiSpeed) {
        this._glowSpeedSeen = uiSpeed;
        this._needGlowRestart = true;
      }
      const glowCss = glowStyle(
        cfg,
        glowPreview.rgb,
        light.brightness,
        light.isOn && art.showGlow,
        glowPreview.fx,
        glowPreview.speed,
        glowPreview.flashFast
      );
      const stateLabel = this._pendingLabel || glowPreview.label;
      const pillPending = Boolean(this._pendingLabel);

      return html`
        <ha-card>
          <div
            class="card ${light.isOn ? "on" : "off"} ${light.ok ? "" : "unavailable"} view-${art.view} ${pillPending ? "is-sending" : ""}"
          >
            <div class="header">
              <span class="title">${title}</span>
              <span
                class="ble ${ble ? "on" : ""}"
                title="${ble ? "Connected" : "Not connected"}"
              >
                ${this._bleIcon()}
              </span>
            </div>

            <div class="stage">
              <div
                class="fixture-wrap ${art.showGlow ? "has-glow" : "no-glow"}"
                style="${art.showGlow ? glowCss : ""}"
              >
                <img
                  class="fixture-img"
                  src="${art.src}"
                  alt=""
                  draggable="false"
                />
                ${art.showGlow
                  ? html`<div
                      class="lens-glow ${glowPreview.fx}"
                      style="${glowPreview.fx
                        ? `animation-duration:${fxDur}s;`
                        : ""}"
                      aria-hidden="true"
                    ></div>`
                  : ""}
              </div>
            </div>

            <label class="brightness-row">
              <span class="brightness-label">Brightness</span>
              <input
                type="range"
                min="1"
                max="255"
                .value=${String(light.brightness || 1)}
                ?disabled=${!light.ok || this._busy}
                @change=${this._setBrightness}
              />
            </label>

            ${cfg.show_effects !== false
              ? html`
                  <label class="effect-row">
                    <span class="effect-label">Effect</span>
                    <select
                      class="effect-select"
                      ?disabled=${!light.ok || this._ipoolBusy}
                      @change=${this._pickEffect}
                    >
                      <option value="" ?selected=${!selectedEffect}>
                        Solid color (swatches)
                      </option>
                      ${EFFECT_OPTIONS.map(
                        (g) => html`
                          <optgroup label=${g.group}>
                            ${g.items.map(
                              (name) => html`
                                <option
                                  value=${name}
                                  ?selected=${selectedEffect === name}
                                >
                                  ${name}
                                </option>
                              `
                            )}
                          </optgroup>
                        `
                      )}
                    </select>
                  </label>
                  ${selectedEffect
                    ? html`
                        <label class="speed-row">
                          <span class="speed-label">Speed (${uiSpeed})</span>
                          <input
                            type="range"
                            min="1"
                            max="10"
                            step="1"
                            .value=${String(uiSpeed)}
                            ?disabled=${!light.ok || this._ipoolBusy}
                            @input=${this._onEffectSpeedInput}
                            @change=${this._setEffectSpeed}
                          />
                        </label>
                      `
                    : ""}
                `
              : ""}

            ${solidColorMode
              ? html`
                  <div class="swatches" role="group" aria-label="Colors">
                    ${PRESETS.map(
                      (p) => html`
                        <button
                          type="button"
                          class="swatch ${rgbEqual(light.rgb, p.rgb)
                            ? "active"
                            : ""}"
                          style="--swatch:${`rgb(${p.rgb.join(",")})`}"
                          title="${p.name}"
                          ?disabled=${!light.ok || this._busy}
                          @click=${() => this._pickColor(p.rgb)}
                        ></button>
                      `
                    )}
                    <label class="swatch custom" title="Custom color">
                      <input
                        type="color"
                        .value=${`#${[r, g, b]
                          .map((x) => x.toString(16).padStart(2, "0"))
                          .join("")}`}
                        ?disabled=${!light.ok || this._busy}
                        @change=${this._pickCustom}
                      />
                    </label>
                  </div>
                `
              : ""}

            <div class="footer">
              <div class="state-pill ${pillPending ? "is-pending" : ""}">
                <span
                  class="dot ${light.isOn ? "on" : ""} ${pillPending ? "pending" : ""}"
                  style=${light.isOn && !pillPending
                    ? `background: rgb(${r},${g},${b}); box-shadow: 0 0 10px rgba(${r},${g},${b},0.75)`
                    : ""}
                ></span>
                <span class="state-text">${stateLabel}</span>
              </div>
              <button
                type="button"
                class="power ${light.isOn ? "on" : ""}"
                ?disabled=${!light.ok || this._busy}
                @click=${this._togglePower}
                title="${light.isOn ? "Turn off" : "Turn on"}"
              >
                ${this._powerIcon()}
              </button>
            </div>
          </div>
        </ha-card>
      `;
    }

    _powerIcon() {
      return html`
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 3v9M8.5 5.5a7 7 0 1 0 7 0"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          />
        </svg>
      `;
    }

    _bleIcon() {
      return html`
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M6 12a6 6 0 0 1 12 0M9 12a3 3 0 0 1 6 0M12 12v3"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
          />
        </svg>
      `;
    }

    static get styles() {
      return css`
        :host {
          display: block;
        }
        ha-card {
          overflow: hidden;
        }
        .card {
          padding: 12px 14px 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .setup-card {
          min-height: 120px;
          justify-content: center;
          text-align: center;
        }
        .setup-msg {
          margin: 0;
          color: var(--primary-text-color);
          font-size: 0.95rem;
        }
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .title {
          font-size: 1rem;
          font-weight: 600;
          color: var(--primary-text-color);
        }
        .ble {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--disabled-text-color);
          background: var(--secondary-background-color);
          transition:
            color 0.3s,
            background 0.3s,
            box-shadow 0.3s;
        }
        .ble.on {
          color: #38bdf8;
          background: rgba(56, 189, 248, 0.15);
          box-shadow: 0 0 12px rgba(56, 189, 248, 0.45);
        }
        .ble svg {
          width: 18px;
          height: 18px;
        }
        .stage {
          display: flex;
          justify-content: center;
          padding: 4px 0;
        }
        .fixture-wrap {
          position: relative;
          width: 100%;
          max-width: 220px;
          line-height: 0;
        }
        .view-control-box .fixture-wrap {
          max-width: 200px;
        }
        .view-control-box .fixture-img {
          max-height: 200px;
          object-fit: contain;
        }
        .fixture-img {
          width: 100%;
          height: auto;
          display: block;
          border-radius: 8px;
        }
        .lens-glow {
          position: absolute;
          top: var(--pl-glow-top, 22%);
          left: var(--pl-glow-left, 22%);
          width: var(--pl-glow-size, 56%);
          aspect-ratio: 1;
          border-radius: 50%;
          pointer-events: none;
          opacity: var(--pl-dim, 0);
          background: var(--pl-glow-bg);
          mix-blend-mode: screen;
          filter: blur(1px) brightness(var(--pl-glow-filter, 1));
          transition:
            opacity 0.35s ease,
            filter 0.35s ease;
        }
        .card.on .lens-glow:not([class*="fx-"]) {
          animation: glow-breathe 3s ease-in-out infinite;
        }
        .card.on .lens-glow.fx-jump-tri {
          animation: fx-jump-tri var(--pl-fx-duration, 1.05s) steps(3, end)
            infinite;
        }
        .card.on .lens-glow.fx-jump-seven {
          animation: fx-jump-seven var(--pl-fx-duration, 1.75s) steps(7, end)
            infinite;
        }
        .card.on .lens-glow.fx-gradient-mono {
          animation: fx-gradient-mono var(--pl-fx-duration, 2.8s) ease-in-out
            infinite alternate;
        }
        .card.on .lens-glow.fx-gradient-rg {
          animation: fx-gradient-rg var(--pl-fx-duration, 2.4s) ease-in-out
            infinite;
        }
        .card.on .lens-glow.fx-gradient-rb {
          animation: fx-gradient-rb var(--pl-fx-duration, 2.4s) ease-in-out
            infinite;
        }
        .card.on .lens-glow.fx-gradient-gb {
          animation: fx-gradient-gb var(--pl-fx-duration, 2.4s) ease-in-out
            infinite;
        }
        .card.on .lens-glow.fx-flash {
          animation: fx-flash-pulse var(--pl-fx-duration, 0.32s) ease-in-out
            infinite alternate;
        }
        .fixture-wrap.has-glow .lens-glow {
          box-shadow: var(--pl-glow-shadow, none);
        }
        .effect-row {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .effect-label {
          font-size: 0.78rem;
          color: var(--secondary-text-color);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .effect-select {
          width: 100%;
          padding: 8px 10px;
          border-radius: 8px;
          border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12));
          background: var(--secondary-background-color);
          color: var(--primary-text-color);
          font-size: 0.9rem;
        }
        .effect-select:disabled {
          opacity: 0.45;
        }
        .speed-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .speed-label {
          font-size: 0.8rem;
          color: var(--secondary-text-color);
          flex-shrink: 0;
          width: 5.5rem;
        }
        .speed-row input[type="range"] {
          flex: 1;
          accent-color: #a78bfa;
        }
        .brightness-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .brightness-label {
          font-size: 0.8rem;
          color: var(--secondary-text-color);
          flex-shrink: 0;
          width: 4.5rem;
        }
        .brightness-row input[type="range"] {
          flex: 1;
          accent-color: #38bdf8;
        }
        .swatches {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 8px;
          justify-items: center;
        }
        .swatch {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 2px solid transparent;
          background: var(--swatch, #fff);
          cursor: pointer;
          padding: 0;
          box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.12);
          transition:
            transform 0.15s,
            border-color 0.15s,
            box-shadow 0.15s;
        }
        .swatch:hover:not(:disabled) {
          transform: scale(1.08);
        }
        .swatch:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
        .swatch.active {
          border-color: var(--primary-text-color);
          box-shadow:
            0 0 0 2px var(--card-background-color),
            0 0 12px var(--swatch);
        }
        .swatch.custom {
          position: relative;
          overflow: hidden;
          background: conic-gradient(
            #f00,
            #ff0,
            #0f0,
            #0ff,
            #00f,
            #f0f,
            #f00
          );
        }
        .swatch.custom input[type="color"] {
          position: absolute;
          inset: 0;
          opacity: 0;
          cursor: pointer;
          width: 100%;
          height: 100%;
          border: none;
          padding: 0;
        }
        .footer {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .state-pill {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          border-radius: 20px;
          background: var(--secondary-background-color);
          flex: 1;
          min-width: 0;
        }
        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--disabled-text-color);
          flex-shrink: 0;
        }
        .state-text {
          font-size: 0.9rem;
          color: var(--primary-text-color);
        }
        .state-pill.is-pending {
          box-shadow: 0 0 0 1px rgba(56, 189, 248, 0.35);
        }
        .state-pill.is-pending .state-text {
          color: #7dd3fc;
        }
        .dot.pending {
          background: #38bdf8 !important;
          box-shadow: 0 0 10px rgba(56, 189, 248, 0.85) !important;
          animation: pill-pulse 0.9s ease-in-out infinite alternate;
        }
        @keyframes pill-pulse {
          from {
            opacity: 0.45;
            transform: scale(0.85);
          }
          to {
            opacity: 1;
            transform: scale(1.1);
          }
        }
        .power {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--secondary-background-color);
          color: var(--primary-text-color);
          transition:
            background 0.25s,
            box-shadow 0.25s,
            transform 0.15s;
          flex-shrink: 0;
        }
        .power:hover:not(:disabled) {
          transform: scale(1.05);
        }
        .power:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
        .power.on {
          background: #1d4ed8;
          color: #fff;
          box-shadow: 0 0 16px rgba(29, 78, 216, 0.55);
        }
        .power svg {
          width: 26px;
          height: 26px;
        }
        @keyframes glow-breathe {
          0%,
          100% {
            filter: blur(1px) brightness(0.92);
          }
          50% {
            filter: blur(2px) brightness(1.08);
          }
        }
        @keyframes fx-jump-tri {
          0%,
          100% {
            background: radial-gradient(
              circle at 45% 40%,
              rgba(255, 48, 48, 0.95) 0%,
              rgba(255, 48, 48, 0.55) 38%,
              rgba(255, 48, 48, 0.2) 62%,
              transparent 72%
            );
            box-shadow: 0 0 36px rgba(255, 48, 48, 0.75);
          }
          33% {
            background: radial-gradient(
              circle at 45% 40%,
              rgba(48, 220, 96, 0.95) 0%,
              rgba(48, 220, 96, 0.55) 38%,
              rgba(48, 220, 96, 0.2) 62%,
              transparent 72%
            );
            box-shadow: 0 0 36px rgba(48, 220, 96, 0.75);
          }
          66% {
            background: radial-gradient(
              circle at 45% 40%,
              rgba(48, 140, 255, 0.95) 0%,
              rgba(48, 140, 255, 0.55) 38%,
              rgba(48, 140, 255, 0.2) 62%,
              transparent 72%
            );
            box-shadow: 0 0 36px rgba(48, 140, 255, 0.75);
          }
        }
        @keyframes fx-jump-seven {
          0% {
            background: radial-gradient(
              circle at 45% 40%,
              rgba(255, 48, 48, 0.95) 0%,
              transparent 72%
            );
          }
          14% {
            background: radial-gradient(
              circle at 45% 40%,
              rgba(255, 140, 0, 0.95) 0%,
              transparent 72%
            );
          }
          28% {
            background: radial-gradient(
              circle at 45% 40%,
              rgba(255, 230, 64, 0.95) 0%,
              transparent 72%
            );
          }
          42% {
            background: radial-gradient(
              circle at 45% 40%,
              rgba(48, 220, 96, 0.95) 0%,
              transparent 72%
            );
          }
          57% {
            background: radial-gradient(
              circle at 45% 40%,
              rgba(64, 210, 255, 0.95) 0%,
              transparent 72%
            );
          }
          71% {
            background: radial-gradient(
              circle at 45% 40%,
              rgba(120, 72, 255, 0.95) 0%,
              transparent 72%
            );
          }
          85% {
            background: radial-gradient(
              circle at 45% 40%,
              rgba(255, 96, 200, 0.95) 0%,
              transparent 72%
            );
          }
          100% {
            background: radial-gradient(
              circle at 45% 40%,
              rgba(255, 48, 48, 0.95) 0%,
              transparent 72%
            );
          }
        }
        @keyframes fx-gradient-mono {
          from {
            opacity: calc(var(--pl-dim, 0.8) * 0.28);
            filter: blur(0.5px) brightness(0.7);
          }
          to {
            opacity: calc(var(--pl-dim, 0.8) * 1);
            filter: blur(2px) brightness(1.25);
          }
        }
        @keyframes fx-gradient-rg {
          0%,
          100% {
            background: radial-gradient(
              circle at 45% 40%,
              rgba(255, 72, 48, 0.95) 0%,
              rgba(255, 72, 48, 0.45) 42%,
              transparent 72%
            );
            box-shadow: 0 0 36px rgba(255, 72, 48, 0.75);
          }
          50% {
            background: radial-gradient(
              circle at 45% 40%,
              rgba(48, 220, 120, 0.95) 0%,
              rgba(48, 220, 120, 0.45) 42%,
              transparent 72%
            );
            box-shadow: 0 0 36px rgba(48, 220, 120, 0.75);
          }
        }
        @keyframes fx-gradient-rb {
          0%,
          100% {
            background: radial-gradient(
              circle at 45% 40%,
              rgba(255, 72, 48, 0.95) 0%,
              rgba(255, 72, 48, 0.45) 42%,
              transparent 72%
            );
            box-shadow: 0 0 36px rgba(255, 72, 48, 0.75);
          }
          50% {
            background: radial-gradient(
              circle at 45% 40%,
              rgba(48, 140, 255, 0.95) 0%,
              rgba(48, 140, 255, 0.45) 42%,
              transparent 72%
            );
            box-shadow: 0 0 36px rgba(48, 140, 255, 0.75);
          }
        }
        @keyframes fx-gradient-gb {
          0%,
          100% {
            background: radial-gradient(
              circle at 45% 40%,
              rgba(48, 220, 120, 0.95) 0%,
              rgba(48, 220, 120, 0.45) 42%,
              transparent 72%
            );
            box-shadow: 0 0 36px rgba(48, 220, 120, 0.75);
          }
          50% {
            background: radial-gradient(
              circle at 45% 40%,
              rgba(48, 140, 255, 0.95) 0%,
              rgba(48, 140, 255, 0.45) 42%,
              transparent 72%
            );
            box-shadow: 0 0 36px rgba(48, 140, 255, 0.75);
          }
        }
        @keyframes fx-flash-pulse {
          from {
            opacity: calc(var(--pl-dim, 0.8) * 0.12);
            filter: blur(0.5px) brightness(0.85);
          }
          to {
            opacity: calc(var(--pl-dim, 0.8) * 1);
            filter: blur(2px) brightness(1.35);
          }
        }
      `;
    }
  }

  class PoolLightCardEditor extends LitElement {
    static get properties() {
      return { hass: {}, config: {} };
    }

    setConfig(config) {
      this.config = mergeConfig(config || {});
    }

    _valueChanged(ev) {
      this.dispatchEvent(
        new CustomEvent("config-changed", {
          detail: { config: ev.detail.value },
        })
      );
    }

    render() {
      if (!this.hass) return html``;
      const merged = mergeConfig(this.config || {});
      return html`
        <ha-form
          .hass=${this.hass}
          .data=${merged}
          .schema=${[
            {
              name: "entity",
              selector: { entity: { domain: "light" } },
            },
            {
              name: "entity_connected",
              selector: { entity: { domain: "binary_sensor" } },
            },
            { name: "name", selector: { text: {} } },
            { name: "image", selector: { text: {} } },
            { name: "image_control_box", selector: { text: {} } },
            {
              name: "show_fixture_when",
              type: "select",
              options: [
                ["auto", "Auto (fixture on, control box off)"],
                ["always", "Always show fixture"],
                ["never", "Always show control box"],
              ],
            },
            {
              name: "show_effects",
              selector: { boolean: {} },
            },
            {
              name: "show_effect_preview",
              selector: { boolean: {} },
            },
            {
              name: "glow_top",
              selector: {
                number: { mode: "box", min: 0, max: 100, step: 0.5 },
              },
            },
            {
              name: "glow_left",
              selector: {
                number: { mode: "box", min: 0, max: 100, step: 0.5 },
              },
            },
            {
              name: "glow_size",
              selector: {
                number: { mode: "box", min: 10, max: 100, step: 0.5 },
              },
            },
            {
              name: "glow_brightness",
              selector: {
                number: { mode: "box", min: 25, max: 250, step: 5 },
              },
            },
          ]}
          .computeLabel=${(s) =>
            ({
              entity: "Light entity",
              entity_connected: "Connected (optional BLE sensor)",
              name: "Card title override",
              image: "Fixture image URL (light on)",
              image_control_box: "Control box image URL (light off)",
              show_fixture_when: "Fixture vs control box",
              show_effects: "Show effect dropdown (ipool_light v0.1.3+)",
              show_effect_preview:
                "Animate lens glow when an effect is selected (card preview only)",
              glow_top: "Lens glow — top %",
              glow_left: "Lens glow — left %",
              glow_size: "Lens glow — size %",
              glow_brightness: "Lens glow — brightness %",
            })[s.name] || s.name}
          @value-changed=${this._valueChanged}
        ></ha-form>
      `;
    }
  }

  customElements.define("pool-light-card", PoolLightCard);
  customElements.define("pool-light-card-editor", PoolLightCardEditor);

  window.customCards = window.customCards || [];
  window.customCards.push({
    type: "pool-light-card",
    name: "Pool Light Card",
    description:
      "RGB pool light card — colors, APK effects, lens preview synced to effect, speed",
    preview: true,
    documentationURL:
      "https://github.com/randrcomputers/ha-pool-light-card#readme",
  });
})();
