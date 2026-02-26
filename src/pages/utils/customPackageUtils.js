/**
 * Custom Package Utilities
 * 
 * This utility provides functions to get effective package values
 * whether the package is standard or custom with JSON limits.
 * The display format stays exactly the same, only the data source changes.
 */

/**
 * Get effective value from a package (handles both standard and custom plans)
 * @param {Object} packageData - The package object (from user_business_packages)
 * @param {string} field - The field to get ('guests', 'events', 'price', 'features')
 * @param {*} defaultValue - Default value if not found
 * @returns {*} The effective value
 */
export const getEffectivePackageValue = (packageData, field, defaultValue = null) => {
    if (!packageData) return defaultValue;

    // Check if this is a custom plan with JSON limits
    const isCustom = packageData.is_custom === 1 || packageData.is_custom === true;
    
    if (isCustom && packageData.custom_limits) {
        try {
            const customLimits = typeof packageData.custom_limits === 'string' 
                ? JSON.parse(packageData.custom_limits) 
                : packageData.custom_limits;

            // Return the custom value if it exists
            switch (field) {
                case 'guests':
                    return customLimits.guests !== undefined ? customLimits.guests : packageData.max_guests;
                case 'events':
                    return customLimits.events !== undefined ? customLimits.events : packageData.event_limit;
                case 'price':
                    return customLimits.price !== undefined ? customLimits.price : packageData.custom_price || packageData.price;
                case 'features':
                    return customLimits.features || [];
                default:
                    return customLimits[field] !== undefined ? customLimits[field] : defaultValue;
            }
        } catch (error) {
            console.error('Error parsing custom limits:', error);
            return defaultValue;
        }
    }

    // For standard packages, return the normal values
    switch (field) {
        case 'guests':
            return packageData.max_guests;
        case 'events':
            return packageData.event_limit || packageData.max_events;
        case 'price':
            return packageData.custom_price || packageData.price;
        case 'features':
            if (packageData.features) {
                if (Array.isArray(packageData.features)) return packageData.features;
                if (typeof packageData.features === 'string') {
                    return packageData.features.split(',').map(f => f.trim());
                }
            }
            return [];
        default:
            return defaultValue;
    }
};

/**
 * Get effective package name
 * @param {Object} packageData - The package object
 * @returns {string} Package name
 */
export const getEffectivePackageName = (packageData) => {
    if (!packageData) return 'No Package';
    
    const isCustom = packageData.is_custom === 1 || packageData.is_custom === true;
    
    if (isCustom) {
        // You can customize this if you want custom plans to show a different name
        return packageData.name || 'Custom Plan';
    }
    
    return packageData.name || 'Business Package';
};

/**
 * Check if a package is custom
 * @param {Object} packageData - The package object
 * @returns {boolean} True if custom plan
 */
export const isCustomPackage = (packageData) => {
    return packageData?.is_custom === 1 || packageData?.is_custom === true;
};

/**
 * Format features array for display
 * @param {Array|string} features - Features array or comma-separated string
 * @returns {Array} Formatted features array
 */
export const formatFeatures = (features) => {
    if (!features) return [];
    
    if (Array.isArray(features)) {
        return features;
    }
    
    if (typeof features === 'string') {
        return features.split(',').map(f => f.trim()).filter(f => f.length > 0);
    }
    
    return [];
};

/**
 * Check if user can create an event based on their package
 * @param {Object} packageData - The package object
 * @param {number} eventsUsed - Number of events already used
 * @returns {Object} Result with allowed status and message
 */
export const canCreateEvent = (packageData, eventsUsed) => {
    if (!packageData) {
        return {
            allowed: false,
            message: 'No active package found',
            remaining: 0
        };
    }

    const eventLimit = getEffectivePackageValue(packageData, 'events', 0);
    
    // Unlimited events
    if (eventLimit === 0) {
        return {
            allowed: true,
            message: 'Unlimited events available',
            remaining: 'Unlimited'
        };
    }

    const remaining = eventLimit - eventsUsed;
    
    if (remaining <= 0) {
        return {
            allowed: false,
            message: `You've used all ${eventLimit} events`,
            remaining: 0
        };
    }

    return {
        allowed: true,
        message: `${remaining} events remaining`,
        remaining
    };
};

/**
 * Check if user can host an event with given guest count
 * @param {Object} packageData - The package object
 * @param {number} requestedGuests - Number of guests requested
 * @returns {Object} Result with allowed status and message
 */
export const canHostGuests = (packageData, requestedGuests) => {
    if (!packageData) {
        return {
            allowed: false,
            message: 'No active package found'
        };
    }

    const guestLimit = getEffectivePackageValue(packageData, 'guests', 0);
    
    if (guestLimit === 0) {
        return {
            allowed: true,
            message: 'Unlimited guests allowed'
        };
    }

    if (requestedGuests > guestLimit) {
        return {
            allowed: false,
            message: `Your plan allows maximum ${guestLimit} guests`
        };
    }

    return {
        allowed: true,
        message: `Within limit of ${guestLimit} guests`
    };
};