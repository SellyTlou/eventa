// Updated template structure with placeholder support
export const templates = {
  Birthday: [
    {
      id: "695:56",
      title: "Baby Shower Invitation – Purple Celebration Theme",
      description: "Baby shower invitation with balloons, stars, logo and decorative elements",
      image: "https://iili.io/fURJDFV.png",
      
      // Define what data this template can accept
      placeholders: {
        eventName: { type: "text", default: "Baby Shower" },
        guestName: { type: "text", default: "Baby" },
        eventDate: { type: "date", default: "Coming Soon" },
        eventTime: { type: "time", default: "Time TBD" },
        eventLocation: { type: "text", default: "Location TBD" }
      },

      data: {
        texts: [
          // We'll make these dynamic with placeholder references
          {
            id: "695:placeholder-1",
            text: "{{eventName}}", // Placeholder syntax
            x: 250,
            y: 110,
            fontSize: 68,
            fontFamily: "Berkshire Swash, cursive",
            fill: "rgb(250,106,113)",
            align: "center",
            rotation: 0,
            opacity: 1,
            zIndex: 11,
            type: "text",
            width: 420,
            wrap: "none",
            lineHeight: 1.1
          },
          {
            id: "695:placeholder-2",
            text: "in honor of {{guestName}}",
            x: 250,
            y: 180,
            fontSize: 22,
            fontFamily: "Fondamento, cursive",
            fill: "rgb(141,141,141)",
            align: "center",
            rotation: 0,
            opacity: 1,
            zIndex: 10,
            type: "text",
            width: 360,
            wrap: "none",
            lineHeight: 1.2
          },
          {
            id: "695:placeholder-3",
            text: "{{eventDate}} at {{eventTime}}",
            x: 250,
            y: 230,
            fontSize: 30,
            fontFamily: "Fraunces, serif",
            fill: "rgb(0,117,163)",
            align: "center",
            rotation: 0,
            opacity: 1,
            zIndex: 12,
            type: "text",
            width: 400,
            wrap: "word",
            lineHeight: 1.3
          },
          {
            id: "695:placeholder-4",
            text: "{{eventLocation}}",
            x: 250,
            y: 280,
            fontSize: 20,
            fontFamily: "Fondamento, cursive",
            fill: "rgb(154,154,154)",
            align: "center",
            rotation: 0,
            opacity: 1,
            zIndex: 10,
            type: "text",
            width: 400,
            wrap: "word",
            lineHeight: 1.2
          }
        ],

        images: [
          // Keep existing images
          {
            id: "695:75",
            src: "BG_1_IMAGE_URL",
            x: 0,
            y: 0,
            width: 500,
            height: 400,
            rotation: 0,
            opacity: 1,
            zIndex: 1,
            type: "image",
            draggable: false
          },
          // ... other images remain the same
        ],

        shapes: [
          {
            id: "background-color",
            shapeType: "rect",
            x: 0,
            y: 0,
            width: 500,
            height: 400,
            fill: "rgb(77,44,91)",
            rotation: 0,
            opacity: 1,
            zIndex: 0,
            type: "shape",
            draggable: false
          }
        ],

        bgConfig: {
          type: "image",
          value: "BG_1_IMAGE_URL"
        }
      },

      design: {
        id: "695:56",
        name: "Frame 1637",
        type: "FRAME",
        properties: {
          size: { width: 500, height: 400 }
        }
      }
    },

    // Example of a birthday template with proper placeholders
    {
      id: "730:187",
      title: "Birthday Invitation – Elegant Pink Theme",
      description: "Birthday invitation celebrating a special birthday with soft pink tones and photo frame",
      image: "https://iili.io/fgHEW3g.png",
      
      placeholders: {
        guestName: { type: "text", default: "Birthday Person" },
        eventDate: { type: "date", default: "Date TBD" },
        eventTime: { type: "time", default: "Time TBD" },
        eventLocation: { type: "text", default: "Location TBD" },
        age: { type: "text", default: "" }
      },

      data: {
        texts: [
          {
            id: "730:189",
            text: "Happy Birthday",
            x: 250,
            y: 29,
            fontSize: 24,
            fontFamily: "Oi, cursive",
            fill: "rgb(166,199,193)",
            align: "center",
            rotation: 0,
            opacity: 1,
            zIndex: 10,
            type: "text",
            width: 320,
            wrap: "none",
            lineHeight: 1.2
          },
          {
            id: "730:191",
            text: "{{age}}",
            x: 250,
            y: 90,
            fontSize: 96,
            fontFamily: "Newsreader, serif",
            fontWeight: "800",
            fill: "rgb(255,199,56)",
            align: "center",
            rotation: 0,
            opacity: 1,
            zIndex: 11,
            type: "text",
            width: 200,
            wrap: "none",
            lineHeight: 1
          },
          {
            id: "730:195",
            text: "{{guestName}}!",
            x: 250,
            y: 350,
            fontSize: 24,
            fontFamily: "Oi, cursive",
            fill: "rgb(166,199,193)",
            align: "center",
            rotation: 0,
            opacity: 1,
            zIndex: 10,
            type: "text",
            width: 200,
            wrap: "none",
            lineHeight: 1.2
          },
          {
            id: "730:199",
            text: "{{eventDate}} at {{eventTime}}",
            x: 450,
            y: 200,
            fontSize: 20,
            fontFamily: "Newsreader, serif",
            fill: "rgb(117,91,39)",
            align: "center",
            rotation: -90.18,
            opacity: 1,
            zIndex: 12,
            type: "text",
            width: 240,
            wrap: "none",
            lineHeight: 1.2
          },
          {
            id: "730:200",
            text: "{{eventLocation}}",
            x: 250,
            y: 300,
            fontSize: 18,
            fontFamily: "Newsreader, serif",
            fill: "rgb(117,91,39)",
            align: "center",
            rotation: 0,
            opacity: 1,
            zIndex: 10,
            type: "text",
            width: 300,
            wrap: "word",
            lineHeight: 1.3
          }
        ],

        images: [
          {
            id: "730:193",
            src: "https://iili.io/fgHXqzv.png",
            x: 130,
            y: 70,
            width: 241,
            height: 286,
            rotation: 0,
            opacity: 1,
            zIndex: 6,
            type: "image",
            draggable: false
          }
        ],

        shapes: [
          {
            id: "background",
            shapeType: "rect",
            x: 0,
            y: 0,
            width: 500,
            height: 400,
            fill: "#FFFFFF",
            rotation: 0,
            opacity: 1,
            zIndex: 0,
            type: "shape",
            draggable: false
          },
          {
            id: "inner-card",
            shapeType: "rect",
            x: 26,
            y: 17,
            width: 446,
            height: 359,
            fill: "rgb(254,218,251)",
            rotation: 0,
            opacity: 1,
            zIndex: 1,
            type: "shape",
            draggable: false
          }
        ],

        bgConfig: {
          type: "color",
          value: "#FFFFFF"
        }
      },

      design: {
        id: "730:187",
        name: "Frame 1643",
        type: "FRAME",
        properties: {
          size: { width: 500, height: 400 }
        }
      }
    }
  ],
  
  // Add similar placeholder structure to other categories
  BabyShower: [
    // ... update with placeholders
  ],
  
  Wedding: [
    // ... update with placeholders
  ],
  
  Graduation: [
    // ... update with placeholders
  ]
};