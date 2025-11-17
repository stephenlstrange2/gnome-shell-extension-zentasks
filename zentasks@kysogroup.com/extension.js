import GObject from "gi://GObject";
import St from "gi://St";

import {
  Extension,
  gettext as _,
} from "resource:///org/gnome/shell/extensions/extension.js";
import * as PanelMenu from "resource:///org/gnome/shell/ui/panelMenu.js";
import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";
import * as Main from "resource:///org/gnome/shell/ui/main.js";

const ZenTasksIndicator = GObject.registerClass(
  class ZenTasksIndicator extends PanelMenu.Button {
    _init() {
      // Texto interno / accesibilidad
      super._init(0.0, _("ZenTasks"));

      // Icono en la barra (lo puedes cambiar luego)
      this._icon = new St.Icon({
        icon_name: "alarm-symbolic",
        style_class: "system-status-icon",
      });
      this.add_child(this._icon);

      // --------- MENÚ PRINCIPAL ---------

      // Título
      const titleItem = new PopupMenu.PopupMenuItem(
        _("ZenTasks – Jira & Pomodoro"),
      );
      titleItem.reactive = false; // que no se pueda clicar
      this.menu.addMenuItem(titleItem);

      this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

      // Acción: Sync with Jira (placeholder)
      this.menu.addAction(_("Sync with Jira"), () => {
        Main.notify(_("ZenTasks"), _("Sync with Jira (placeholder)…"));
        // Aquí luego irán las llamadas reales a Jira (REST / token / etc.)
      });

      // Acción: Start Pomodoro (placeholder)
      this.menu.addAction(_("Start Pomodoro"), () => {
        Main.notify(_("ZenTasks"), _("Pomodoro started (placeholder)…"));
        // Aquí luego implementamos el timer real con 25/5, etc.
      });

      // Acción: My Tasks (Today)
      this.menu.addAction(_("My Tasks (Today)"), () => {
        Main.notify(_("ZenTasks"), _("Opening tasks list (placeholder)…"));
        // Después esto mostrará una lista de issues dentro del menú
      });

      this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

      // Ítem de estado (solo texto, para que luego lo actualicemos)
      this._statusItem = new PopupMenu.PopupMenuItem(_("Status: idle"));
      this._statusItem.reactive = false;
      this.menu.addMenuItem(this._statusItem);
    }
  },
);

export default class ZenTasksExtension extends Extension {
  enable() {
    this._indicator = new ZenTasksIndicator();
    // Nombre interno en la barra; no tiene que ser igual al uuid, solo único
    Main.panel.addToStatusArea("zentasks-indicator", this._indicator);
  }

  disable() {
    if (this._indicator) {
      this._indicator.destroy();
      this._indicator = null;
    }
  }
}
