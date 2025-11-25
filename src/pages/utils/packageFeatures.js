// Package feature configuration
export const packageFeatures = {
    basic: {
        name: "Basic",
        features: {
            exportRSVP: false,
            guestInsights: false,
            bulkMessages: false,
            guestRemoval: false,
            advancedAnalytics: false,
            customReports: false
        },
    },
    premium: {
        name: "Premium", 
        features: {
            exportRSVP: true,
            guestInsights: true,
            bulkMessages: true,
            guestRemoval: true,
            advancedAnalytics: true,
            customReports: false
        },
    },
    enterprise: {
        name: "Enterprise",
        features: {
            exportRSVP: true,
            guestInsights: true,
            bulkMessages: true,
            guestRemoval: true,
            advancedAnalytics: true,
            customReports: true
        },
    }
};

// Helper function to check if a feature is allowed
export const canUseFeature = (userPackage, feature) => {
    const packageType = userPackage?.package_type?.toLowerCase() || 'basic';
    return packageFeatures[packageType]?.features[feature] || false;
};

// Helper to get package info
export const getPackageInfo = (userPackage) => {
    const packageType = userPackage?.package_type?.toLowerCase() || 'basic';
    return packageFeatures[packageType] || packageFeatures.basic;
};