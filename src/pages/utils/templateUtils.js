// utils/templateUtils.js

/**
 * Replace placeholders in template text with actual event data
 * @param {Object} template - The selected template
 * @param {Object} eventData - User's event data from CreateEvent
 * @returns {Object} - Template with replaced placeholders
 */
export const populateTemplateWithEventData = (template, eventData) => {
  if (!template || !template.data) return template;

  // Clone the template to avoid mutating original
  const populatedTemplate = JSON.parse(JSON.stringify(template));
  
  // Prepare replacement values
  const replacements = {
    eventName: eventData.eventName || template.placeholders?.eventName?.default || "",
    guestName: extractGuestName(eventData.eventName) || template.placeholders?.guestName?.default || "",
    eventDate: formatDate(eventData.eventStartDate) || template.placeholders?.eventDate?.default || "",
    eventTime: formatTime(eventData.eventStartTime) || template.placeholders?.eventTime?.default || "",
    eventEndTime: formatTime(eventData.eventEndTime) || "",
    eventLocation: eventData.eventLocation || template.placeholders?.eventLocation?.default || "",
    eventCity: eventData.eventCity || "",
    eventProvince: eventData.eventProvince || "",
    age: calculateAge(eventData.eventStartDate, eventData.eventName) || template.placeholders?.age?.default || "",
    hostName: extractHostName(eventData.eventName) || "",
    timezone: eventData.timezone || "",
    // Add more as needed
  };

  // Replace placeholders in all text elements
  if (populatedTemplate.data.texts) {
    populatedTemplate.data.texts = populatedTemplate.data.texts.map(textElement => {
      let updatedText = textElement.text;
      
      // Replace all {{placeholder}} with actual values
      Object.keys(replacements).forEach(key => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        updatedText = updatedText.replace(regex, replacements[key]);
      });
      
      return {
        ...textElement,
        text: updatedText
      };
    });
  }

  // Also replace placeholders in image sources if needed
  if (populatedTemplate.data.images) {
    populatedTemplate.data.images = populatedTemplate.data.images.map(image => {
      let updatedSrc = image.src;
      
      Object.keys(replacements).forEach(key => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        updatedSrc = updatedSrc.replace(regex, replacements[key]);
      });
      
      return {
        ...image,
        src: updatedSrc
      };
    });
  }

  return populatedTemplate;
};

// Helper functions
const formatDate = (dateString) => {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
  } catch {
    return dateString;
  }
};

const formatTime = (timeString) => {
  if (!timeString) return "";
  try {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return timeString;
  }
};

const extractGuestName = (eventName) => {
  if (!eventName) return "";
  // Try to extract name from event title like "John's Birthday"
  const patterns = [
    /^([\w\s]+)'s/i,
    /for\s+([\w\s]+)$/i,
    /celebrating\s+([\w\s]+)/i
  ];
  
  for (const pattern of patterns) {
    const match = eventName.match(pattern);
    if (match) return match[1].trim();
  }
  return "";
};

const calculateAge = (eventDate, eventName) => {
  // This is a placeholder - you might want to extract age from event name
  // e.g., "Sarah's 30th Birthday" -> "30"
  if (!eventName) return "";
  const ageMatch = eventName.match(/(\d+)(?:st|nd|rd|th)?\s*birthday/i);
  if (ageMatch) return ageMatch[1];
  return "";
};

const extractHostName = (eventName) => {
  if (!eventName) return "";
  const hostMatch = eventName.match(/^([\w\s]+)'s/i);
  if (hostMatch) return hostMatch[1];
  return "";
};