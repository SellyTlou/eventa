"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.templates = void 0;
var templates = {
  Birthday: [{
    id: "bd01_birthday_rose",
    title: "Selly's Birthday – Rose Frame",
    description: "Elegant rose frame with centered event info",
    image: "https://iili.io/fJY34St.md.png",
    data: {
      bgConfig: {
        type: "image",
        value: "https://iili.io/fJ7D35Q.md.png"
      },
      images: [{
        id: "rose-left",
        src: "https://i.ibb.co/rRGdhbxL/image.png",
        x: 0,
        y: 377,
        width: 126,
        height: 118,
        opacity: 0.8,
        zIndex: 20
      }, {
        id: "rose-right",
        src: "https://i.ibb.co/rRGdhbxL/image.png",
        x: 264,
        y: 372,
        width: 136,
        height: 128,
        opacity: 0.8,
        zIndex: 21
      }],
      // All text elements – will be auto-centered by your button
      texts: [{
        id: "text-title",
        text: "Welcome To Selly's Birthday Party",
        x: 200,
        y: 113,
        fontSize: 24,
        fontFamily: "Inter",
        fontStyle: "bold",
        fill: "#B729A6",
        align: "center",
        opacity: 1,
        zIndex: 1000,
        width: 360
      }, {
        id: "text-date",
        text: "Date : 22 Sep 2015",
        x: 200,
        y: 203,
        fontSize: 22,
        fontFamily: "Inter",
        fontStyle: "bold",
        fill: "#B729A6",
        align: "center",
        opacity: 1,
        zIndex: 1001,
        width: 300
      }, {
        id: "text-time",
        text: "Time: 18:00 - 06:00",
        x: 200,
        y: 272,
        fontSize: 22,
        fontFamily: "Inter",
        fontStyle: "bold",
        fill: "#B729A6",
        align: "center",
        opacity: 1,
        zIndex: 1002,
        width: 300
      }, {
        id: "text-location",
        text: "Location : 22 smith jozi 25",
        x: 200,
        y: 346,
        fontSize: 22,
        fontFamily: "Inter",
        fontStyle: "bold",
        fill: "#B729A6",
        align: "center",
        opacity: 1,
        zIndex: 1003,
        width: 340
      }],
      // SUBTLE ELEGANT OVERLAY
      shapes: [{
        id: "elegant-overlay",
        shapeType: "rect",
        x: 0,
        y: 0,
        width: 600,
        height: 700,
        fill: "#000000",
        opacity: 0.18,
        // Perfect balance – not too dark
        zIndex: 10
      }]
    }
  } // ... you can add more templates here
  ]
};
exports.templates = templates;
//# sourceMappingURL=templates.dev.js.map
