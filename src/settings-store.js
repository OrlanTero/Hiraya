/**
 * Universal settings storage mechanism that works in both main and renderer processes
 * Uses localStorage in renderer process and in-memory storage in main process
 */
const { app } = require("electron");

class SettingsStore {
  constructor(options = {}) {
    this.options = options;
    this.data = {};

    // Detect if we're in the renderer process or main process
    this.isRenderer = typeof window !== "undefined" && window.localStorage;

    // Initialize with defaults from schema
    if (options.schema) {
      Object.keys(options.schema).forEach((key) => {
        if (options.schema[key].default !== undefined) {
          this.data[key] = options.schema[key].default;
        }
      });
    }

    // In renderer process, load from localStorage if available
    if (this.isRenderer) {
      try {
        const savedSettings = localStorage.getItem("app-settings");
        if (savedSettings) {
          const parsed = JSON.parse(savedSettings);
          this.data = { ...this.data, ...parsed };
        }
      } catch (err) {
        console.error("Error loading settings from localStorage:", err);
      }
    }
  }

  // Get a setting
  get(key) {
    return key ? this.data[key] : this.data;
  }

  // Set a setting
  set(key, value) {
    if (typeof key === "object") {
      // Handle object of settings
      this.data = { ...this.data, ...key };
    } else {
      this.data[key] = value;
    }

    // In renderer process, save to localStorage
    if (this.isRenderer) {
      try {
        localStorage.setItem("app-settings", JSON.stringify(this.data));
      } catch (err) {
        console.error("Error saving settings to localStorage:", err);
      }
    }

    return this;
  }

  // Delete a setting
  delete(key) {
    delete this.data[key];

    // In renderer process, update localStorage
    if (this.isRenderer) {
      try {
        localStorage.setItem("app-settings", JSON.stringify(this.data));
      } catch (err) {
        console.error("Error saving settings to localStorage:", err);
      }
    }

    return this;
  }

  // Get all settings
  get store() {
    return { ...this.data };
  }

  // Set all settings
  set store(value) {
    this.data = { ...value };

    // In renderer process, save to localStorage
    if (this.isRenderer) {
      try {
        localStorage.setItem("app-settings", JSON.stringify(this.data));
      } catch (err) {
        console.error("Error saving settings to localStorage:", err);
      }
    }
  }

  // Clear all settings
  clear() {
    this.data = {};

    // In renderer process, clear localStorage
    if (this.isRenderer) {
      try {
        localStorage.removeItem("app-settings");
      } catch (err) {
        console.error("Error clearing settings from localStorage:", err);
      }
    }

    return this;
  }
}

// Export the class
module.exports = SettingsStore;
