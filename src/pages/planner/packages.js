export const packages = {
    Basic: {
        id: "basic",
        name: "Basic",
        maxGuest: 50,
        maxEvents: 5,
        price: 0,
        features: [
            "Access to basic templates",
            "Create and send invitations",  
            "RSVP tracking",
            "Event management tools"
        ]
    },
    Free: {
        id: "free",
        name: "Free",
        maxGuest: 50,
        maxEvents: 1,
        price: 0,
        features: [
            "Access to basic templates",
            "Create and send invitations",
            "RSVP tracking",
            "Event management tools"
        ]
    },
    Premium: {
        id: "premium",
        name: "Premium",
        maxGuest: 200,
        maxEvents: 20,
        price: 49.99,
        features: [
            "All Basic features",
            "Access to premium templates",
            "Custom branding options",
            "Priority support", 
            "Advanced RSVP analytics"
        ]
    },
    Enterprise: {
        id: "enterprise",
        name: "Enterprise",
        maxGuest: 1000,
        maxEvents: 100,
        price: 99.99,
        features: [
            "All Premium features",
            "Dedicated account manager",
            "Custom integrations",
            "Unlimited events",
            "Team collaboration tools"  
        ]
    }
};


// packageFeatures.js
export const canUseFeature = (packageName, feature) => {
    if (!packageName) return false;
    
    const normalizedPackage = packageName.toLowerCase().trim();
    
    const packageFeatures = {
        basic: {
            exportRSVP: false,
            bulkMessages: false,
            guestRemoval: false
        },
        premium: {
            exportRSVP: true,
            bulkMessages: true,
            guestRemoval: true
        },
        enterprise: {
            exportRSVP: true,
            bulkMessages: true,
            guestRemoval: true
        }
    };

    return packageFeatures[normalizedPackage]?.[feature] || false;
};

export const getPackageInfo = (packageName) => {
    const normalizedPackage = packageName?.toLowerCase() || 'basic';
    
    const packages = {
        basic: {
            name: "Basic",
            color: "#6c757d",
            features: ["Basic event management", "RSVP tracking", "Basic analytics"]
        },
        premium: {
            name: "Premium",
            color: "#007bff",
            features: ["All Basic features", "Export to PDF", "Bulk messaging", "Advanced analytics"]
        },
        enterprise: {
            name: "Enterprise",
            color: "#28a745",
            features: ["All Premium features", "Priority support", "Custom integrations", "Advanced security"]
        }
    };

    return packages[normalizedPackage] || packages.basic;
};