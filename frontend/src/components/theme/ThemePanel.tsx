import React from 'react';
import { X, RotateCcw } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import {
  ACCENT_SWATCHES,
  FONT_OPTIONS,
  PRESETS,
  type ThemePreset,
} from '../../lib/themeDefaults';
import { isPresetActive } from '../../lib/themeDefaults';

const ThemePanel: React.FC = () => {
  const {
    preferences,
    updatePreferences,
    applyPreset,
    resetToDefault,
    isPanelOpen,
    closePanel,
  } = useTheme();

  if (!isPanelOpen) return null;

  return (
    <>
      <div className="theme-panel-backdrop" onClick={closePanel} aria-hidden="true" />
      <aside className="theme-panel" role="dialog" aria-label="Personalizar tema">
        <div className="theme-panel-head">
          <div>
            <div className="side-lbl">// personalización</div>
            <h3 className="theme-panel-title">Tu tema</h3>
          </div>
          <button type="button" onClick={closePanel} className="btn-icon" style={{ width: 34, height: 34 }} aria-label="Cerrar">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="theme-panel-body">
          <section className="side-sec">
            <div className="side-lbl">Presets de tema</div>
            <div className="presets">
              {PRESETS.map((preset: ThemePreset) => (
                <button
                  key={preset.name}
                  type="button"
                  className={`preset ${isPresetActive(preset, preferences) ? 'on' : ''}`}
                  onClick={() => applyPreset(preset)}
                >
                  <span className="pname">{preset.name}</span>
                  <span className="pdots">
                    <i style={{ background: preset.accent_color }} />
                    <i style={{ background: preset.bg_color }} />
                    <i style={{ background: preset.panel_color }} />
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="side-sec">
            <div className="side-lbl">Color de acento</div>
            <div className="acc-row">
              <input
                type="color"
                value={preferences.accent_color}
                onChange={e => updatePreferences({ accent_color: e.target.value })}
                aria-label="Color de acento"
              />
              <span className="hex mono">{preferences.accent_color}</span>
            </div>
            <div className="swatches">
              {ACCENT_SWATCHES.map(c => (
                <button
                  key={c}
                  type="button"
                  className={`sw ${preferences.accent_color.toLowerCase() === c.toLowerCase() ? 'on' : ''}`}
                  style={{ background: c }}
                  onClick={() => updatePreferences({ accent_color: c })}
                  aria-label={`Acento ${c}`}
                />
              ))}
            </div>
          </section>

          <section className="side-sec">
            <div className="side-lbl">Fondos</div>
            <div className="bg-row">
              {([
                ['base', 'bg_color'],
                ['panel', 'panel_color'],
                ['tarjeta', 'card_color'],
              ] as const).map(([label, key]) => (
                <div key={key} className="bg-item">
                  <span className="bl">{label}</span>
                  <input
                    type="color"
                    value={preferences[key]}
                    onChange={e => updatePreferences({ [key]: e.target.value })}
                    aria-label={`Fondo ${label}`}
                  />
                  <span className="hex mono">{preferences[key]}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="side-sec">
            <div className="side-lbl">Forma y densidad</div>
            <div className="ctl">
              <div className="ctl-top">
                <span>Redondez</span>
                <output>{preferences.radius}px</output>
              </div>
              <input
                type="range"
                min={0}
                max={22}
                value={preferences.radius}
                onChange={e => updatePreferences({ radius: Number(e.target.value) })}
              />
            </div>
            <div className="ctl">
              <div className="ctl-top">
                <span>Padding de tarjetas</span>
                <output>{preferences.card_padding}px</output>
              </div>
              <input
                type="range"
                min={12}
                max={30}
                value={preferences.card_padding}
                onChange={e => updatePreferences({ card_padding: Number(e.target.value) })}
              />
            </div>
          </section>

          <section className="side-sec">
            <div className="side-lbl">Efectos</div>
            <div className="ctl">
              <div className="ctl-top">
                <span>Intensidad de glow</span>
                <output>{preferences.glow_intensity}%</output>
              </div>
              <input
                type="range"
                min={0}
                max={70}
                value={preferences.glow_intensity}
                onChange={e => updatePreferences({ glow_intensity: Number(e.target.value) })}
              />
            </div>
            <div className="tgl-row">
              <span>Grilla de fondo</span>
              <label className="tgl">
                <input
                  type="checkbox"
                  checked={preferences.show_grid}
                  onChange={e => updatePreferences({ show_grid: e.target.checked })}
                />
                <i />
              </label>
            </div>
            <div className="tgl-row">
              <span>Ruido / noise</span>
              <label className="tgl">
                <input
                  type="checkbox"
                  checked={preferences.show_noise}
                  onChange={e => updatePreferences({ show_noise: e.target.checked })}
                />
                <i />
              </label>
            </div>
          </section>

          <section className="side-sec">
            <div className="side-lbl">Tipografía display</div>
            <select
              className="theme-select"
              value={preferences.font_family}
              onChange={e => updatePreferences({ font_family: e.target.value })}
            >
              {FONT_OPTIONS.map(f => (
                <option key={f.id} value={f.id}>{f.label}</option>
              ))}
            </select>
          </section>

          <div className="side-actions">
            <button type="button" className="btn btn-ghost btn-sm w-full" onClick={resetToDefault}>
              <RotateCcw className="w-4 h-4" />
              Volver al default
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default ThemePanel;
