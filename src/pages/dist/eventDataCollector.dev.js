"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.useEventCreation = exports.useEventData = void 0;

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(source, true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(source).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var useEventData = function useEventData() {
  // Generate or retrieve a unique device ID
  var getDeviceId = function getDeviceId() {
    var deviceId = localStorage.getItem('eventa_device_id');

    if (!deviceId) {
      deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('eventa_device_id', deviceId);
    }

    return deviceId;
  };

  var getEventDataKey = function getEventDataKey() {
    var deviceId = getDeviceId();
    return "eventa_".concat(deviceId, "_current_event");
  };

  var saveEventData = function saveEventData(data) {
    try {
      var key = getEventDataKey();
      var existingData = getEventData();

      var updatedData = _objectSpread({}, existingData, {}, data);

      localStorage.setItem(key, JSON.stringify(updatedData));
      return updatedData;
    } catch (error) {
      console.error('Error saving event data:', error);
      return null;
    }
  };

  var getEventData = function getEventData() {
    try {
      var key = getEventDataKey();
      var data = localStorage.getItem(key);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Error retrieving event data:', error);
      return {};
    }
  };

  var getEventField = function getEventField(fieldName) {
    var data = getEventData();
    return data[fieldName] || null;
  };

  var clearEventData = function clearEventData() {
    try {
      var key = getEventDataKey();
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Error clearing event data:', error);
      return false;
    }
  };

  return {
    saveEventData: saveEventData,
    getEventData: getEventData,
    getEventField: getEventField,
    clearEventData: clearEventData,
    getDeviceId: getDeviceId
  };
};

exports.useEventData = useEventData;

var useEventCreation = function useEventCreation() {
  var _useEventData = useEventData(),
      saveEventData = _useEventData.saveEventData,
      getEventData = _useEventData.getEventData;

  var saveStep1Data = function saveStep1Data(eventName) {
    if (!eventName || typeof eventName !== 'string') return false;
    return saveEventData({
      eventName: eventName
    });
  };

  var saveStep2Data = function saveStep2Data(step2Data) {
    if (!step2Data || _typeof(step2Data) !== 'object') return false;
    var eventStartDate = step2Data.eventStartDate,
        eventStartTime = step2Data.eventStartTime,
        eventEndDate = step2Data.eventEndDate,
        eventEndTime = step2Data.eventEndTime,
        timezone = step2Data.timezone;

    if (!eventStartDate || !eventStartTime || !eventEndDate || !eventEndTime || !timezone) {
      return false;
    }

    return saveEventData({
      eventStartDate: eventStartDate,
      eventStartTime: eventStartTime,
      eventEndDate: eventEndDate,
      eventEndTime: eventEndTime,
      timezone: timezone,
      eventLocation: step2Data.eventLocation || '',
      eventUrl: step2Data.eventUrl || 'myevent'
    });
  };

  var getEventDetails = function getEventDetails() {
    return getEventData();
  };

  var isEventDataComplete = function isEventDataComplete() {
    var data = getEventData();
    return !!(data.eventName && data.eventStartDate && data.eventStartTime && data.eventEndDate && data.eventEndTime && data.timezone);
  };

  return {
    saveStep1Data: saveStep1Data,
    saveStep2Data: saveStep2Data,
    getEventDetails: getEventDetails,
    isEventDataComplete: isEventDataComplete
  };
};

exports.useEventCreation = useEventCreation;
//# sourceMappingURL=eventDataCollector.dev.js.map
