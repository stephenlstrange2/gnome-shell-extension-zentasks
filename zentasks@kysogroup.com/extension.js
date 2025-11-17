import GObject from "gi://GObject";
import St from "gi://St";
import Gio from "gi://Gio";
import GLib from "gi://GLib";
import Soup from "gi://Soup";

import {
  Extension,
  gettext as _,
} from "resource:///org/gnome/shell/extensions/extension.js";
import * as PanelMenu from "resource:///org/gnome/shell/ui/panelMenu.js";
import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import * as ModalDialog from "resource:///org/gnome/shell/ui/modalDialog.js";

// ByteArray de la forma clásica compatible
const ByteArray = imports.byteArray;

function getConfigPath() {
  return GLib.build_filenamev([
    GLib.get_home_dir(),
    ".config",
    "zentasks",
    "config.json",
  ]);
}

function loadConfig() {
  const path = getConfigPath();
  try {
    let file = Gio.File.new_for_path(path);
    let [ok, contents] = file.load_contents(null);
    if (!ok) return null;

    let text = ByteArray.toString(contents);
    return JSON.parse(text);
  } catch (e) {
    log(`ZenTasks: no config or error loading config: ${e}`);
    return null;
  }
}

function saveConfig(cfg) {
  const dirPath = GLib.build_filenamev([
    GLib.get_home_dir(),
    ".config",
    "zentasks",
  ]);
  try {
    // Crear carpeta ~/.config/zentasks si no existe
    GLib.mkdir_with_parents(dirPath, 0o700);

    const path = getConfigPath();
    let file = Gio.File.new_for_path(path);
    let data = JSON.stringify(cfg, null, 2);

    file.replace_contents(data, null, false, Gio.FileCreateFlags.NONE, null);

    log("ZenTasks: config saved to " + path);
    Main.notify("ZenTasks", "Jira configuration saved.");
  } catch (e) {
    log("ZenTasks: error saving config: " + e);
    Main.notify("ZenTasks", "Error saving Jira config. See logs.");
  }
}

function fetchJiraIssues() {
  const cfg = loadConfig();
  if (!cfg) {
    Main.notify(
      "ZenTasks",
      "Please configure Jira first (Configure Jira… in the menu).",
    );
    return;
  }

  const base = cfg.jira_base_url.replace(/\/+$/, ""); // quitar slashes extra al final
  const url = `${base}/rest/api/3/search?jql=assignee=currentuser()%20ORDER%20BY%20updated%20DESC&maxResults=10`;

  const session = new Soup.Session();
  const msg = Soup.Message.new("GET", url);

  // Basic Auth con email:token en base64
  const authBytes = ByteArray.fromString(`${cfg.jira_email}:${cfg.jira_token}`);
  const auth = GLib.base64_encode(authBytes);

  msg.request_headers.append("Authorization", `Basic ${auth}`);
  msg.request_headers.append("Accept", "application/json");

  session.send_and_read_async(msg, 0, null, (sess, res) => {
    try {
      const bytes = sess.send_and_read_finish(res);
      const status = msg.get_status();

      if (status !== Soup.Status.OK) {
        Main.notify("ZenTasks", `Jira error: HTTP ${status}`);
        log(`ZenTasks: Jira HTTP error ${status}`);
        return;
      }

      const body = ByteArray.toString(bytes.get_data());
      const data = JSON.parse(body);

      const count = data.issues && data.issues.length ? data.issues.length : 0;
      Main.notify("ZenTasks", `Found ${count} Jira issue(s) assigned to you.`);
      log(`ZenTasks: received ${count} issues from Jira`);
    } catch (e) {
      Main.notify("ZenTasks", "Error talking to Jira (see logs).");
      log("ZenTasks: error parsing Jira response: " + e);
    }
  });
}

const ConfigDialog = GObject.registerClass(
  class ConfigDialog extends ModalDialog.ModalDialog {
    _init() {
      super._init({
        styleClass: "zentasks-config-dialog",
      });

      this._jiraUrlEntry = new St.Entry({
        style_class: "zentasks-entry",
        x_expand: true,
        can_focus: true,
      });

      this._emailEntry = new St.Entry({
        style_class: "zentasks-entry",
        x_expand: true,
        can_focus: true,
      });

      this._tokenEntry = new St.Entry({
        style_class: "zentasks-entry",
        x_expand: true,
        can_focus: true,
      });

      // Cargar config existente si hay
      let cfg = loadConfig();
      if (cfg) {
        this._jiraUrlEntry.set_text(cfg.jira_base_url || "");
        this._emailEntry.set_text(cfg.jira_email || "");
        this._tokenEntry.set_text(cfg.jira_token || "");
      }

      // Contenido del diálogo
      let mainBox = new St.BoxLayout({
        vertical: true,
        style_class: "zentasks-config-content",
      });
      this.contentLayout.add_child(mainBox);

      function addLabeledEntry(parent, labelText, entry) {
        let row = new St.BoxLayout({
          vertical: true,
          x_expand: true,
          style_class: "zentasks-config-row",
        });

        let label = new St.Label({
          text: labelText,
          x_align: St.Align.START,
        });

        row.add_child(label);
        row.add_child(entry);
        parent.add_child(row);
      }

      addLabeledEntry(
        mainBox,
        _("Jira base URL (e.g. https://yourcompany.atlassian.net)"),
        this._jiraUrlEntry,
      );
      addLabeledEntry(mainBox, _("Jira email"), this._emailEntry);
      addLabeledEntry(mainBox, _("Jira API token"), this._tokenEntry);

      this.setButtons([
        {
          label: _("Cancel"),
          action: () => this.close(),
        },
        {
          label: _("Save"),
          default: true,
          action: () => this._onSave(),
        },
      ]);
    }

    _onSave() {
      const jiraUrl = this._jiraUrlEntry.get_text().trim();
      const email = this._emailEntry.get_text().trim();
      const token = this._tokenEntry.get_text().trim();

      if (!jiraUrl || !email || !token) {
        Main.notify("ZenTasks", "All fields are required.");
        return;
      }

      saveConfig({
        jira_base_url: jiraUrl,
        jira_email: email,
        jira_token: token,
      });

      this.close();
    }
  },
);

const ZenTasksIndicator = GObject.registerClass(
  class ZenTasksIndicator extends PanelMenu.Button {
    _init() {
      super._init(0.0, _("ZenTasks"));

      this._icon = new St.Icon({
        icon_name: "alarm-symbolic",
        style_class: "system-status-icon",
      });
      this.add_child(this._icon);

      // --------- MENÚ ---------

      // Configuración Jira
      this.menu.addAction(_("Configure Jira…"), () => {
        let dialog = new ConfigDialog();
        dialog.open();
      });

      this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

      const titleItem = new PopupMenu.PopupMenuItem(
        _("ZenTasks – Jira & Pomodoro"),
      );
      titleItem.reactive = false;
      this.menu.addMenuItem(titleItem);

      this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

      // Placeholder actions
      this.menu.addAction(_("Sync with Jira"), () => {
        fetchJiraIssues();
      });

      this.menu.addAction(_("Start Pomodoro"), () => {
        Main.notify(_("ZenTasks"), _("Pomodoro started (placeholder)…"));
      });

      this.menu.addAction(_("My Tasks (Today)"), () => {
        Main.notify(_("ZenTasks"), _("Opening tasks list (placeholder)…"));
      });

      this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

      this._statusItem = new PopupMenu.PopupMenuItem(_("Status: idle"));
      this._statusItem.reactive = false;
      this.menu.addMenuItem(this._statusItem);
    }
  },
);

export default class ZenTasksExtension extends Extension {
  enable() {
    this._indicator = new ZenTasksIndicator();
    Main.panel.addToStatusArea("zentasks-indicator", this._indicator);
  }

  disable() {
    if (this._indicator) {
      this._indicator.destroy();
      this._indicator = null;
    }
  }
}
