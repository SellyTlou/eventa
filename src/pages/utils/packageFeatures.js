// Package feature configuration - UPDATED to match your database exactly
export const packageFeatures = {
    basic: {  
        name: "basic",
        features: {
            exportRSVP: false,
            guestInsights: false,
            bulkMessages: false,
            guestRemoval: false,
            advancedAnalytics: false,
            customReports: false,
            advancedStats: false
        },
    },
    premium: {  
        name: "premium", 
        features: {
            exportRSVP: true,
            guestInsights: true,
            bulkMessages: true,
            guestRemoval: true,
            advancedAnalytics: true,
            customReports: false,
            advancedStats: true
        },
    },
    enterprise: {  
        name: "enterprise",
        features: {
            exportRSVP: true,
            guestInsights: true,
            bulkMessages: true,
            guestRemoval: true,
            advancedAnalytics: true,
            customReports: true,
            advancedStats: true
        },
    }
};

// Helper function to check if a feature is allowed - UPDATED
export const canUseFeature = (userPackage, feature) => {
    if (!userPackage) {
        console.log("❌ No user package provided");
        return false;
    }
    
    // Normalize package_type to lower-case for robust matching
    const rawPackageType = userPackage.package_type;
    const packageType = typeof rawPackageType === 'string' ? rawPackageType.toLowerCase() : rawPackageType;
    
    if (!packageType) {
        console.log("❌ No package_type found in user package:", userPackage);
        return false;
    }
    
    // Try direct key lookup first, then fallback to case-insensitive search by name
    let pkgConfig = packageFeatures[packageType];
    if (!pkgConfig) {
        // Fallback: find by matching name property (case-insensitive)
        pkgConfig = Object.values(packageFeatures).find(p => p.name && p.name.toLowerCase() === String(rawPackageType).toLowerCase());
    }

    if (!pkgConfig) {
        console.log(`❌ Package type '${packageType}' not found in packageFeatures`);
        return false;
    }

    const hasFeature = pkgConfig.features?.[feature] || false;
    
    console.log(`🔍 Feature Check: '${feature}' for '${packageType}' = ${hasFeature}`);
    return hasFeature;
};

// Helper to get package info - UPDATED
export const getPackageInfo = (userPackage) => {
    if (!userPackage || !userPackage.package_type) {
        console.log("⚠️ No user package, defaulting to Basic");
        return packageFeatures.basic;
    }
    const rawPackageType = userPackage.package_type;
    const packageType = typeof rawPackageType === 'string' ? rawPackageType.toLowerCase() : rawPackageType;

    let packageConfig = packageFeatures[packageType];
    if (!packageConfig) {
        // fallback to matching by name property
        packageConfig = Object.values(packageFeatures).find(p => p.name && p.name.toLowerCase() === String(rawPackageType).toLowerCase());
    }

    if (!packageConfig) {
        console.log(`⚠️ Package type '${packageType}' not found, defaulting to Basic`);
        return packageFeatures.basic;
    }

    console.log(`📦 Package Info: ${packageConfig.name}`);
    return packageConfig;
};

// NEW: Helper to get all available packages
export const getAvailablePackages = () => {
    return Object.keys(packageFeatures).map(key => ({
        id: key,
        ...packageFeatures[key]
    }));
};

// NEW: Helper to check if user can upgrade
export const canUpgrade = (currentPackage, targetPackage) => {
    const packageHierarchy = ['basic', 'premium', 'enterprise'];
    const currentIndex = packageHierarchy.indexOf(currentPackage);
    const targetIndex = packageHierarchy.indexOf(targetPackage);
    
    return targetIndex > currentIndex;
};

// NEW: Helper to get upgrade suggestions
export const getUpgradeSuggestions = (currentPackage) => {
    const packages = getAvailablePackages();
    return packages.filter(pkg => canUpgrade(currentPackage, pkg.id));
};