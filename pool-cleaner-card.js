/**
 * Pool Cleaner Card — Lovelace custom card (HACS)
 * Maytronics Dolphin (BLE): local images under /local/pool_card/ + CSS overlays.
 */
(function () {
  const LitElement = Object.getPrototypeOf(customElements.get("ha-panel-lovelace"));
  const { html, css } = LitElement.prototype;

  const CARD_VERSION = "2.1.0";

  /** Defaults — put robot.png / psu.png in config/www/pool_card/ */
  const DEFAULTS = Object.freeze({
    image_robot: "/local/pool_card/robot.png",
    image_psu: "/local/pool_card/psu.png",
    robot_led_top: 32,
    robot_led_left: 44,
    robot_led_width: 12,
    robot_led_height: 40,
    robot_led_radius: 6,
    robot_led_brightness: 100,
    psu_ring_cx: 40,
    psu_ring_cy: 55,
    psu_ring_size: 15,
  });

  function num(config, key, fallback) {
    const v = config[key];
    if (v === undefined || v === null || v === "") return fallback;
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  function numPx(config, key, fallback) {
    const v = config[key];
    if (v === undefined || v === null || v === "") return fallback;
    const n = Number(v);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(48, Math.max(0, n));
  }

  function ledBrightnessMul(config) {
    const b = num(config, "robot_led_brightness", DEFAULTS.robot_led_brightness);
    const clamped = Math.min(220, Math.max(25, b));
    return (clamped / 100).toFixed(3);
  }

  /** CSS variables string for overlay geometry (percents vs art box). */
  function overlayVars(config) {
    const c = config;
    return `
      --pc-led-top:${num(c, "robot_led_top", DEFAULTS.robot_led_top)}%;
      --pc-led-left:${num(c, "robot_led_left", DEFAULTS.robot_led_left)}%;
      --pc-led-w:${num(c, "robot_led_width", DEFAULTS.robot_led_width)}%;
      --pc-led-h:${num(c, "robot_led_height", DEFAULTS.robot_led_height)}%;
      --pc-led-radius:${numPx(c, "robot_led_radius", DEFAULTS.robot_led_radius)}px;
      --pc-led-brightness:${ledBrightnessMul(c)};
      --pc-ring-cx:${num(c, "psu_ring_cx", DEFAULTS.psu_ring_cx)}%;
      --pc-ring-cy:${num(c, "psu_ring_cy", DEFAULTS.psu_ring_cy)}%;
      --pc-ring-size:${num(c, "psu_ring_size", DEFAULTS.psu_ring_size)}%;
    `.trim();
  }

  const ENTITY_SUFFIXES = {
    power: "_power",
    state: "_cleaner_state",
    cleaning: "_cleaning_active",
    connected: "_ps_state_poll_ok",
  };

  function entityState(hass, entityId) {
    if (!entityId || !hass?.states?.[entityId]) return null;
    return hass.states[entityId];
  }

  function resolveEntities(hass, config) {
    if (config.entity_power) {
      return {
        power: config.entity_power,
        state: config.entity_state || null,
        cleaning: config.entity_cleaning || null,
        connected: config.entity_connected || null,
      };
    }
    if (config.device) {
      const devId = config.device;
      const found = { power: null, state: null, cleaning: null, connected: null };
      const registry = hass.entities || {};
      for (const [eid, ent] of Object.entries(registry)) {
        if (ent.device_id !== devId || !hass.states[eid]) continue;
        const uid = ent.unique_id || "";
        if (uid.endsWith(ENTITY_SUFFIXES.power)) found.power = eid;
        if (uid.endsWith(ENTITY_SUFFIXES.state)) found.state = eid;
        if (uid.endsWith(ENTITY_SUFFIXES.cleaning)) found.cleaning = eid;
        if (uid.endsWith(ENTITY_SUFFIXES.connected)) found.connected = eid;
      }
      return found;
    }
    return { power: null, state: null, cleaning: null, connected: null };
  }

  function isOn(hass, entityId) {
    const st = entityState(hass, entityId);
    if (!st) return false;
    return st.state === "on";
  }

  function isConnected(hass, entityId) {
    const st = entityState(hass, entityId);
    if (!st) return false;
    return st.state === "on";
  }

  function displayState(hass, entities, config) {
    if (config.state_text) return config.state_text;
    const st = entityState(hass, entities.state);
    if (!st) return "—";
    const raw = st.state;
    const labels = {
      off: "Off",
      on: "Running",
      hold: "Hold",
      programming: "Programming",
      self_test: "Self test",
      unknown: "Unknown",
    };
    return labels[raw] || st.attributes?.friendly_name || raw;
  }

  function showCleanerActive(hass, entities, config) {
    if (config.show_cleaner_when === "always") return true;
    if (config.show_cleaner_when === "never") return false;
    if (entities.cleaning && isOn(hass, entities.cleaning)) return true;
    if (entities.power && isOn(hass, entities.power)) return true;
    const st = entityState(hass, entities.state);
    if (st && st.state !== "off" && st.state !== "unknown" && st.state !== "unavailable")
      return true;
    return false;
  }

  function isConfigIncomplete(config) {
    return !config?.entity_power && !config?.device;
  }

  function mergeConfig(config) {
    return {
      ...DEFAULTS,
      show_cleaner_when: "auto",
      ...config,
    };
  }

  class PoolCleanerCard extends LitElement {
    static get properties() {
      return {
        hass: {},
        config: {},
        _busy: { state: false },
      };
    }

    static getConfigElement() {
      return document.createElement("pool-cleaner-card-editor");
    }

    static getStubConfig() {
      return { type: "custom:pool-cleaner-card" };
    }

    getCardSize() {
      return 4;
    }

    setConfig(config) {
      this.config = mergeConfig(config);
    }

    _togglePower() {
      const entities = resolveEntities(this.hass, this.config);
      if (!entities.power || this._busy) return;
      this._busy = true;
      this.hass
        .callService("switch", "toggle", { entity_id: entities.power })
        .finally(() => {
          this._busy = false;
        });
    }

    render() {
      if (!this.hass || !this.config) return html``;

      if (isConfigIncomplete(this.config)) {
        return html`
          <ha-card>
            <div class="card setup-card">
              <p class="setup-msg">
                Choose your <strong>Dolphin device</strong> (recommended) or
                <strong>Power switch</strong> in the card options.
              </p>
              <p class="setup-ver">pool-cleaner-card.js v${CARD_VERSION}</p>
            </div>
          </ha-card>
        `;
      }

      const cfg = mergeConfig(this.config);
      const entities = resolveEntities(this.hass, cfg);
      const title =
        cfg.name ||
        entityState(this.hass, entities.power)?.attributes?.friendly_name?.replace(
          /\s+power$/i,
          ""
        ) ||
        "Pool cleaner";

      const active = showCleanerActive(this.hass, entities, cfg);
      const powered = entities.power && isOn(this.hass, entities.power);
      const ble = entities.connected
        ? isConnected(this.hass, entities.connected)
        : entities.power &&
          entityState(this.hass, entities.power)?.state !== "unavailable";

      const stateLabel = displayState(this.hass, entities, cfg);
      const imgSrc = active ? cfg.image_robot : cfg.image_psu;

      return html`
        <ha-card>
          <div
            class="card pc-local ${active ? "active" : "idle"} ${powered ? "power-supply-on" : ""}"
          >
            <div class="header">
              <span class="title">${title}</span>
              <span
                class="ble ${ble ? "on" : ""}"
                title="${ble ? "BLE link OK" : "Not connected"}"
              >
                ${this._bleIcon()}
              </span>
            </div>

            <div class="stage" aria-hidden="true">
              <div class="art-local-wrap" style="${overlayVars(cfg)}">
                <img class="art-img" src="${imgSrc}" alt="" draggable="false" />
                ${active ? html`<div class="robot-led-overlay"></div>` : ""}
                ${!active ? html`<div class="psu-ring-overlay"></div>` : ""}
              </div>
              ${active ? html`<div class="bubbles"></div>` : ""}
            </div>

            <div class="footer">
              <div class="state-pill">
                <span class="dot ${active ? "pulse" : ""}"></span>
                <span class="state-text">${stateLabel}</span>
              </div>
              <button
                class="power ${powered ? "on" : ""}"
                ?disabled=${!entities.power || this._busy}
                @click=${this._togglePower}
                title="${powered ? "Turn off" : "Turn on"}"
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
          background: var(--card-background-color, var(--ha-card-background));
        }
        .card {
          padding: 12px 14px 14px;
          min-height: 200px;
          display: flex;
          flex-direction: column;
        }
        .setup-card {
          justify-content: center;
          text-align: center;
        }
        .setup-msg {
          margin: 0 0 8px;
          color: var(--primary-text-color);
          font-size: 0.95rem;
        }
        .setup-ver {
          margin: 0;
          font-size: 12px;
          color: var(--secondary-text-color);
        }
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 4px;
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
          flex: 1;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 130px;
        }
        .art-local-wrap {
          position: relative;
          width: 100%;
          max-width: 240px;
          display: inline-block;
          line-height: 0;
        }
        .art-img {
          width: 100%;
          height: auto;
          max-height: 160px;
          object-fit: contain;
          display: block;
          border-radius: 8px;
        }
        .robot-led-overlay {
          position: absolute;
          top: var(--pc-led-top, 32%);
          left: var(--pc-led-left, 44%);
          width: var(--pc-led-w, 12%);
          height: var(--pc-led-h, 40%);
          border-radius: var(--pc-led-radius, 6px);
          pointer-events: none;
          background: radial-gradient(
            ellipse at center,
            rgba(147, 224, 255, 0.95) 0%,
            rgba(56, 189, 248, 0.55) 45%,
            rgba(56, 189, 248, 0.15) 100%
          );
          mix-blend-mode: lighten;
          filter: brightness(var(--pc-led-brightness, 1));
          will-change: opacity;
        }
        .card.active.pc-local .robot-led-overlay {
          animation: led-soft-breathe 2.8s ease-in-out infinite;
        }
        .psu-ring-overlay {
          position: absolute;
          top: calc(var(--pc-ring-cy, 55%) - var(--pc-ring-size, 15%) / 2);
          left: calc(var(--pc-ring-cx, 40%) - var(--pc-ring-size, 15%) / 2);
          width: var(--pc-ring-size, 15%);
          aspect-ratio: 1;
          border-radius: 50%;
          pointer-events: none;
          box-sizing: border-box;
          visibility: visible;
          opacity: 0;
          background: transparent;
        }
        .card.idle.pc-local.power-supply-on .psu-ring-overlay {
          opacity: 1;
          border: 3px solid rgba(56, 189, 248, 0.95);
          animation: psu-ring-soft 2.4s ease-in-out infinite;
        }
        .card.idle.pc-local:not(.power-supply-on) .psu-ring-overlay {
          visibility: hidden;
        }
        .card.active.pc-local .art-local-wrap {
          animation: float-soft 4s ease-in-out infinite;
        }
        .bubbles {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: radial-gradient(
              circle at 30% 78%,
              rgba(56, 189, 248, 0.1) 0%,
              transparent 42%
            ),
            radial-gradient(
              circle at 72% 74%,
              rgba(56, 189, 248, 0.08) 0%,
              transparent 38%
            );
          animation: shimmer 5s linear infinite;
        }
        .footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-top: 6px;
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
        .dot.pulse {
          background: #22c55e;
          animation: pulse-dot 1.5s ease-in-out infinite;
        }
        .state-text {
          font-size: 0.9rem;
          color: var(--primary-text-color);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
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
        @keyframes led-soft-breathe {
          0%,
          100% {
            opacity: 0.28;
          }
          50% {
            opacity: 1;
          }
        }
        @keyframes psu-ring-soft {
          0%,
          100% {
            opacity: 0.55;
            box-shadow: 0 0 6px rgba(56, 189, 248, 0.35);
          }
          50% {
            opacity: 1;
            box-shadow: 0 0 20px rgba(56, 189, 248, 0.95);
          }
        }
        @keyframes float-soft {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-3px);
          }
        }
        @keyframes shimmer {
          0% {
            opacity: 0.5;
          }
          50% {
            opacity: 1;
          }
          100% {
            opacity: 0.5;
          }
        }
        @keyframes pulse-dot {
          0%,
          100% {
            box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.5);
          }
          50% {
            box-shadow: 0 0 0 6px rgba(34, 197, 94, 0);
          }
        }
      `;
    }
  }

  function numPercentSchema(name) {
    return {
      name,
      selector: {
        number: {
          mode: "box",
          min: 0,
          max: 100,
          step: 0.5,
        },
      },
    };
  }

  class PoolCleanerCardEditor extends LitElement {
    static get properties() {
      return { hass: {}, config: {} };
    }

    static get styles() {
      return css`
        .installed-meta {
          margin-top: 14px;
          padding: 10px 12px;
          border-radius: 8px;
          background: var(--secondary-background-color);
          color: var(--secondary-text-color);
          font-size: 12px;
          line-height: 1.45;
        }
        .installed-meta strong {
          color: var(--primary-text-color);
        }
      `;
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
              name: "device",
              selector: {
                device: {
                  filter: { integration: "maytronics_dolphin" },
                },
              },
            },
            {
              name: "entity_power",
              selector: { entity: { domain: "switch" } },
            },
            {
              name: "entity_state",
              selector: { entity: { domain: "sensor" } },
            },
            {
              name: "entity_cleaning",
              selector: { entity: { domain: "binary_sensor" } },
            },
            {
              name: "entity_connected",
              selector: { entity: { domain: "binary_sensor" } },
            },
            { name: "name", selector: { text: {} } },
            {
              name: "show_cleaner_when",
              type: "select",
              options: [
                ["auto", "Auto (power / cleaning / state)"],
                ["always", "Always show robot image"],
                ["never", "Always show PSU image"],
              ],
            },
            {
              name: "image_robot",
              selector: { text: {} },
            },
            {
              name: "image_psu",
              selector: { text: {} },
            },
            numPercentSchema("robot_led_top"),
            numPercentSchema("robot_led_left"),
            numPercentSchema("robot_led_width"),
            numPercentSchema("robot_led_height"),
            {
              name: "robot_led_radius",
              selector: {
                number: { mode: "box", min: 0, max: 48, step: 1 },
              },
            },
            {
              name: "robot_led_brightness",
              selector: {
                number: { mode: "box", min: 25, max: 220, step: 5 },
              },
            },
            numPercentSchema("psu_ring_cx"),
            numPercentSchema("psu_ring_cy"),
            numPercentSchema("psu_ring_size"),
          ]}
          .computeLabel=${(s) =>
            ({
              device: "Dolphin device (auto-fills entities)",
              entity_power: "Power switch",
              entity_state: "Cleaner state sensor",
              entity_cleaning: "Cleaning active (optional)",
              entity_connected: "BLE OK / connected (optional)",
              name: "Card title override",
              show_cleaner_when: "Robot vs power supply image",
              image_robot: "Robot image URL (cleaner visible)",
              image_psu: "Power supply image URL (idle)",
              robot_led_top: "Blue LED overlay — top offset %",
              robot_led_left: "Blue LED overlay — left offset %",
              robot_led_width: "Blue LED overlay — width %",
              robot_led_height: "Blue LED overlay — height %",
              robot_led_radius: "Blue LED overlay — radius (px)",
              robot_led_brightness: "Blue LED brightness (% — 100 = default)",
              psu_ring_cx: "PSU power ring — center X %",
              psu_ring_cy: "PSU power ring — center Y %",
              psu_ring_size: "PSU ring — diameter %",
            })[s.name] || s.name}
          @value-changed=${this._valueChanged}
        ></ha-form>
        <div class="installed-meta">
          <strong>pool-cleaner-card.js v${CARD_VERSION}</strong> —
          Images from <strong>/local/</strong> (e.g. <strong>www/pool_card/</strong>). Robot + LED
          move together while floating. Tune <strong>Blue LED brightness</strong> (%; 100 default).
          On PSU art, ring pulses when power switch is <strong>on</strong> — align ring %
          fields to your PNG.
        </div>
      `;
    }
  }

  customElements.define("pool-cleaner-card", PoolCleanerCard);
  customElements.define("pool-cleaner-card-editor", PoolCleanerCardEditor);

  window.__POOL_CLEANER_CARD_VERSION__ = CARD_VERSION;

  window.customCards = window.customCards || [];
  window.customCards.push({
    type: "pool-cleaner-card",
    name: "Pool Cleaner Card",
    description: `Dolphin card — /local/ images + LED/PSU ring (v${CARD_VERSION})`,
    preview: true,
    documentationURL:
      "https://github.com/randrcomputers/ha-pool-cleaner-card#readme",
  });
})();
