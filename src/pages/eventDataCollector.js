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
        
        return saveEventData({ eventName: eventName });
    };

    const saveStep2Data = (step2Data) => {
        if (!step2Data || typeof step2Data !== 'object') return false;
        const { eventStartDate, eventStartTime, eventEndDate, eventEndTime, timezone } = step2Data;
        if (!eventStartDate || !eventStartTime || !eventEndDate || !eventEndTime || !timezone) {
            return false;
        }
        return saveEventData({
            eventStartDate,
            eventStartTime,
            eventEndDate,
            eventEndTime,
            timezone,
            eventLocation: step2Data.eventLocation || '',
            eventUrl: step2Data.eventUrl || 'myevent'
        });
    };

    const getEventDetails = () => {
        return getEventData();
    };

    const isEventDataComplete = () => {
        const data = getEventData();
        return !!(data.eventName && data.eventStartDate && data.eventStartTime &&
            data.eventEndDate && data.eventEndTime && data.timezone);
    };

    return {
        saveStep1Data,
        saveStep2Data,
        getEventDetails,
        isEventDataComplete
    };
};