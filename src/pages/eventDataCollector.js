export const useEventData = () => {
    // Generate or retrieve a unique device ID
    const getDeviceId = () => {
        let deviceId = localStorage.getItem('eventa_device_id');

        if (!deviceId) {
            deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('eventa_device_id', deviceId);
        }

        return deviceId;
    };

    const getEventDataKey = () => {
        const deviceId = getDeviceId();
        return `eventa_${deviceId}_current_event`;
    };

    const saveEventData = (data) => {
        try {
            const key = getEventDataKey();
            const existingData = getEventData();
            const updatedData = { ...existingData, ...data };
            localStorage.setItem(key, JSON.stringify(updatedData));
            console.log('Event data saved:', updatedData); // Debug log
            return updatedData;
        } catch (error) {
            console.error('Error saving event data:', error);
            return null;
        }
    };

    const getEventData = () => {
        try {
            const key = getEventDataKey();
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : {};
        } catch (error) {
            console.error('Error retrieving event data:', error);
            return {};
        }
    };

    const getEventField = (fieldName) => {
        const data = getEventData();
        return data[fieldName] || null;
    };

    const clearEventData = () => {
        try {
            const key = getEventDataKey();
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Error clearing event data:', error);
            return false;
        }
    };

    return {
        saveEventData,
        getEventData,
        getEventField,
        clearEventData,
        getDeviceId
    };
};

export const useEventCreation = () => {
    const { saveEventData, getEventData } = useEventData();

    const saveStep1Data = (eventName) => {
        if (!eventName || typeof eventName !== 'string') return false;
        
        return saveEventData({ eventName: eventName.trim() });
    };

    const saveStep2Data = (step2Data) => {
        if (!step2Data || typeof step2Data !== 'object') return false;
        
        // Only validate required fields (date, time, timezone)
        const { eventStartDate, eventStartTime, eventEndDate, eventEndTime, timezone } = step2Data;
        if (!eventStartDate || !eventStartTime || !eventEndDate || !eventEndTime || !timezone) {
            console.error('Missing required fields in step2Data:', step2Data);
            return false;
        }
        
        // Save ALL fields from step2Data
        return saveEventData({
            // Required fields
            eventStartDate,
            eventStartTime,
            eventEndDate,
            eventEndTime,
            timezone,
            
            // Location fields (with defaults)
            eventLocation: step2Data.eventLocation || '',
            eventCity: step2Data.eventCity || '',
            eventProvince: step2Data.eventProvince || '',
            
            // Category fields (with defaults)
            eventCategory: step2Data.eventCategory || '',
            customCategory: step2Data.customCategory || '',
            
            // Keep existing fields
            eventUrl: step2Data.eventUrl || 'myevent'
        });
    };

    // NEW: Save Event Type Data (Ticket vs RSVP)
    const saveEventTypeData = (eventTypeData) => {
        if (!eventTypeData || typeof eventTypeData !== 'object') return false;
        
        const { eventType, ticketPrice, ticketQuantity, rsvpLimit, requireApproval } = eventTypeData;
        
        // Validate event type is selected
        if (!eventType || (eventType !== 'ticket' && eventType !== 'rsvp')) {
            console.error('Invalid event type:', eventType);
            return false;
        }
        
        // Prepare the data to save
        const dataToSave = {
            eventType,
            requireApproval: requireApproval || false
        };
        
        // Add ticket-specific fields if ticket event
        if (eventType === 'ticket') {
            if (!ticketPrice || parseFloat(ticketPrice) < 0) {
                console.error('Invalid ticket price:', ticketPrice);
                return false;
            }
            if (!ticketQuantity || parseInt(ticketQuantity) < 1) {
                console.error('Invalid ticket quantity:', ticketQuantity);
                return false;
            }
            
            dataToSave.ticketPrice = parseFloat(ticketPrice);
            dataToSave.ticketQuantity = parseInt(ticketQuantity);
            dataToSave.rsvpLimit = null; // Clear RSVP fields
            dataToSave.requireApproval = false;
        }
        
        // Add RSVP-specific fields if RSVP event
        if (eventType === 'rsvp') {
            dataToSave.ticketPrice = null;
            dataToSave.ticketQuantity = null;
            dataToSave.rsvpLimit = rsvpLimit && parseInt(rsvpLimit) > 0 ? parseInt(rsvpLimit) : null;
            dataToSave.requireApproval = requireApproval || false;
        }
        
        return saveEventData(dataToSave);
    };

    // Get event details including event type
    const getEventDetails = () => {
        const data = getEventData();
        
        // Return with default values for missing fields
        return {
            eventName: data.eventName || '',
            eventStartDate: data.eventStartDate || '',
            eventStartTime: data.eventStartTime || '',
            eventEndDate: data.eventEndDate || '',
            eventEndTime: data.eventEndTime || '',
            timezone: data.timezone || 'Africa/Johannesburg',
            eventLocation: data.eventLocation || '',
            eventCity: data.eventCity || '',
            eventProvince: data.eventProvince || '',
            eventCategory: data.eventCategory || '',
            customCategory: data.customCategory || '',
            eventUrl: data.eventUrl || 'myevent',
            
            // Event Type fields
            eventType: data.eventType || null,
            ticketPrice: data.ticketPrice || null,
            ticketQuantity: data.ticketQuantity || null,
            rsvpLimit: data.rsvpLimit || null,
            requireApproval: data.requireApproval || false
        };
    };

    // Check if event data is complete enough to proceed to template selection
    const isEventDataComplete = () => {
        const data = getEventData();
        
        // Check if we have the minimum required fields to proceed
        const hasBasicInfo = !!(data.eventName && 
            data.eventStartDate && 
            data.eventStartTime &&
            data.eventEndDate && 
            data.eventEndTime && 
            data.timezone);
        
        // If we have event type, check if it's properly configured
        let hasEventTypeInfo = true;
        if (data.eventType === 'ticket') {
            hasEventTypeInfo = !!(data.ticketPrice !== null && 
                data.ticketPrice >= 0 && 
                data.ticketQuantity !== null && 
                data.ticketQuantity > 0);
        }
        
        // RSVP events don't require additional validation beyond having an event type
        if (data.eventType === 'rsvp') {
            hasEventTypeInfo = true;
        }
        
        return hasBasicInfo && hasEventTypeInfo;
    };

    // NEW: Check if event type has been selected
    const hasEventTypeSelected = () => {
        const data = getEventData();
        return data.eventType === 'ticket' || data.eventType === 'rsvp';
    };

    // NEW: Get formatted event type for display
    const getEventTypeDisplay = () => {
        const data = getEventData();
        if (data.eventType === 'ticket') {
            return {
                type: 'Ticket Event',
                icon: '🎟️',
                details: `${data.ticketQuantity} tickets available at R${data.ticketPrice} each`
            };
        }
        if (data.eventType === 'rsvp') {
            return {
                type: 'RSVP Event',
                icon: '📝',
                details: data.rsvpLimit ? `${data.rsvpLimit} spots available` : 'Unlimited spots',
                requireApproval: data.requireApproval
            };
        }
        return null;
    };

    // NEW: Update specific event type settings after creation
    const updateTicketSettings = (ticketData) => {
        if (!ticketData || typeof ticketData !== 'object') return false;
        
        return saveEventData({
            ticketPrice: parseFloat(ticketData.price),
            ticketQuantity: parseInt(ticketData.quantity),
            ticketTypes: ticketData.ticketTypes || [] // For multiple ticket types
        });
    };

    const updateRSVPSettings = (rsvpData) => {
        if (!rsvpData || typeof rsvpData !== 'object') return false;
        
        return saveEventData({
            rsvpLimit: rsvpData.limit ? parseInt(rsvpData.limit) : null,
            requireApproval: rsvpData.requireApproval || false
        });
    };

    // NEW: Clear event type data
    const clearEventTypeData = () => {
        return saveEventData({
            eventType: null,
            ticketPrice: null,
            ticketQuantity: null,
            rsvpLimit: null,
            requireApproval: false
        });
    };

    return {
        // Core methods
        saveStep1Data,
        saveStep2Data,
        saveEventTypeData, // NEW
        getEventDetails,
        isEventDataComplete,
        
        // NEW helper methods
        hasEventTypeSelected,
        getEventTypeDisplay,
        updateTicketSettings,
        updateRSVPSettings,
        clearEventTypeData
    };
};