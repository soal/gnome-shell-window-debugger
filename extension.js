/* extension.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

/* exported init */

const { GObject, St, Meta, Gio, GLib } = imports.gi;
// const Lang = imports.lang;
const Mainloop = imports.mainloop;

const ExtensionUtils = imports.misc.extensionUtils;
const Main = imports.ui.main;

function logData(info = '', ...data) {
    console.log('WINDOW TRACKER ' + info, ...data)
}

function createWindowTracker(window) {
    return [
        window.connect('position-changed', () => {
            logData('position-changed', window.wm_class, 'monitor: ', window.get_monitor(), 'workspace: ', window.get_workspace()?.index())
        }),
        window.connect('workspace-changed', () => {
            logData('workspace-changed', window.wm_class, 'monitor: ', window.get_monitor(), 'workspace: ', window.get_workspace()?.index())
        })
    ]
}

class Extension {
    constructor() {
        this.windows = []
        this.trackers = {}
        this._windowCreatedListenerId = null
        this._screenLockListenerId = null
        this._monitorChangedListenerId = null
        this.monitorManager = Meta.MonitorManager.get();
    }

    updateWindows() {
        this.windows = global.get_window_actors().map(actor => actor.get_meta_window())
        this.windows.forEach(window => {
            this.trackers[window.get_id()] = createWindowTracker(window)
        })
    }


    enable() {
        this.updateWindows()

        this._windowCreatedListenerId = global.display.connect('window-created', () => this.updateWindows())

        if (this._screenLockListenerId === null) {
            this._screenLockListenerId = Main.screenShield.connect(
                "locked-changed",
                () => {
                    logData('locked-changed', 'locked: ', Main.screenShield.locked)
                }
            );
        }
        if (this._monitorChangedListenerId === null) {
            this._monitorChangedListenerId = this.monitorManager.connect(
                "monitors-changed",
                () => {
                    logData('monitors-changed')
                    // this.monitorManager.freeze_notify()
                    // this.saveWindowPositions();
                    // this.monitorManager.thaw_notify()
                }
            );
        }

    }

    disable() {
        this.windows.forEach(window => {
            if (!window || !window.get_id()) return
            this.trackers[window.get_id()].forEach(trackerId => {
                window.disconnect(trackerId)
            })
        })
        global.display.disconnect(this._windowCreatedListenerId)
    }
}

function init() {
    return new Extension();
}
