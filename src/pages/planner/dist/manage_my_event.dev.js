"use strict";

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

function _iterableToArrayLimit(arr, i) { if (!(Symbol.iterator in Object(arr) || Object.prototype.toString.call(arr) === "[object Arguments]")) { return; } var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

var fetchEventDetails = function fetchEventDetails(eventId) {
  var API_URL, formData, response, data, event, formatDate, formatTime, formattedEventDetails;
  return regeneratorRuntime.async(function fetchEventDetails$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          _context.prev = 0;
          API_URL = process.env.REACT_APP_API_URL;
          formData = new FormData();
          formData.append("function", "getEventById");
          formData.append("event_id", eventId);
          _context.next = 7;
          return regeneratorRuntime.awrap(fetch("".concat(API_URL, "/query.php"), {
            method: "POST",
            body: formData
          }));

        case 7:
          response = _context.sent;

          if (response.ok) {
            _context.next = 10;
            break;
          }

          throw new Error("Network response was not ok");

        case 10:
          _context.next = 12;
          return regeneratorRuntime.awrap(response.json());

        case 12:
          data = _context.sent;
          console.log("Event details response:", data);

          if (data.success && data.events && data.events.length > 0) {
            event = data.events[0]; // Format the date and time for display

            formatDate = function formatDate(dateString) {
              if (!dateString) return "Not set";

              try {
                return new Date(dateString).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                });
              } catch (error) {
                return dateString;
              }
            };

            formatTime = function formatTime(timeString) {
              if (!timeString) return "";

              try {
                var _timeString$split = timeString.split(':'),
                    _timeString$split2 = _slicedToArray(_timeString$split, 2),
                    hours = _timeString$split2[0],
                    minutes = _timeString$split2[1];

                var hour = parseInt(hours);
                var ampm = hour >= 12 ? 'PM' : 'AM';
                var displayHour = hour % 12 || 12;
                return "".concat(displayHour, ":").concat(minutes, " ").concat(ampm);
              } catch (error) {
                return timeString;
              }
            };

            formattedEventDetails = {
              event_name: event.event_name || "Untitled Event",
              event_start_date: formatDate(event.event_start_date),
              event_end_date: formatDate(event.event_end_date),
              event_start_time: formatTime(event.event_start_time),
              event_end_time: formatTime(event.event_end_time),
              venue: event.event_location || "Venue not specified"
            };
            setEventDetails(formattedEventDetails);
          } else {
            console.error("No event found:", data.message); // Use mock data but with proper field names

            setEventDetails({
              event_name: "Summer Tech Conference 2024",
              event_start_date: "August 15, 2024",
              event_end_date: "August 16, 2024",
              event_start_time: "09:00 AM",
              event_end_time: "05:00 PM",
              venue: "Convention Center, Downtown"
            });
          }

          _context.next = 21;
          break;

        case 17:
          _context.prev = 17;
          _context.t0 = _context["catch"](0);
          console.error("Error fetching event details:", _context.t0); // Fallback to mock data on error

          setEventDetails({
            event_name: "Summer Tech Conference 2024",
            event_start_date: "August 15, 2024",
            event_end_date: "August 16, 2024",
            event_start_time: "09:00 AM",
            event_end_time: "05:00 PM",
            venue: "Convention Center, Downtown"
          });

        case 21:
          _context.prev = 21;
          setLoading(false);
          return _context.finish(21);

        case 24:
        case "end":
          return _context.stop();
      }
    }
  }, null, null, [[0, 17, 21, 24]]);
};
//# sourceMappingURL=manage_my_event.dev.js.map
