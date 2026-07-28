/**
 * Date and Cross-Tab Synchronization Utilities for CHEF
 */

/**
 * Returns a local date string in YYYY-MM-DD format based on browser local time,
 * avoiding UTC date displacement issues caused by toISOString().
 */
export function getLocalDateString(date = new Date()) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const CHEF_EVENTS = {
  NUTRITION_UPDATED: 'chef:nutrition_updated',
  WATER_UPDATED: 'chef:water_updated',
  PROFILE_UPDATED: 'chef:profile_updated',
};

/**
 * Dispatches a custom window event for real-time cross-component sync.
 */
export function dispatchChefEvent(eventName, detail = {}) {
  try {
    const event = new CustomEvent(eventName, { detail });
    window.dispatchEvent(event);
  } catch (err) {
    console.error(`Failed to dispatch event ${eventName}:`, err);
  }
}
