export const templates = {
  Birthday: [],
  BabyShower: [],

  Wedding: [
    {
      id: "439:22",
      title: "Wedding Invitation – Floral",
      description: "Elegant floral wedding invitation",
      image: "https://iili.io/f8Pm0l9.png",

      data: {
        texts: [
          {
            id: "439:30",
            text: "We joyfully invite you to join us in our wedding",
            x: 250,
            y: 110,
            fontSize: 14,
            fontFamily: "Jaldi, sans-serif",
            fill: "#E9456F",
            align: "center",
            rotation: 0,
            opacity: 0.69,
            zIndex: 10,
            type: "text",
            width: 400,
            wrap: "word",
            lineHeight: 1.5
          },
          {
            id: "439:28",
            text: "Marena\n&\nErick",
            x: 250,
            y: 165,
            fontSize: 40,
            fontFamily: "'Mrs Saint Delafield', cursive",
            fontWeight: "bolder",
            fill: "#E9456F",
            align: "center",
            rotation: 0,
            opacity: 1,
            zIndex: 11,
            type: "text",
            fontStyle: "italic", 
            width: 400,
            wrap: "none",
            lineHeight: 1.2 
          },
          {
            id: "439:29",
            text: "at Botanical Gardens on 14 April 2025 at 09:00\nYour presence is cherished",
            x: 250,
            y: 290,
            fontSize: 14,
            fontFamily: "Jaldi, sans-serif",
            fill: "#E9456F",
            align: "center",
            rotation: 0,
            opacity: 0.69,
            zIndex: 10,
            type: "text",
            width: 400,
            wrap: "word",
            lineHeight: 1.8
          }
        ],

        images: [
          {
            id: "439:26",
            src: "https://iili.io/f865AJe.png", // TOP LEFT ROSE - VERIFIED URL
            x: -50,
            y: 10,
            width: 320,
            height: 300,
            rotation: -8,
            opacity: 1,
            zIndex: 5,
            type: "image",
            draggable: false
          },
          {
            id: "439:27",
            src: "https://iili.io/f8iB9X1.png", // BOTTOM RIGHT ROSE - VERIFIED URL
            x: 725,
            y: 425,
            width: 280,
            height: 280,
            rotation: 158,
            opacity: 1,
            zIndex: 5,
            type: "image",
            draggable: false
          }
        ],

        shapes: [
          {
            id: "439:24",
            shapeType: "circle",
            x: 250,
            y: 200,
            radius: 180,
            fill: "rgba(255, 255, 255, 0.85)",
            stroke: "#E9456F",
            strokeWidth: 2,
            opacity: 1,
            zIndex: 3,
            type: "shape",
            draggable: false
          },
          {
            id: "background",
            shapeType: "rect",
            x: 0,
            y: 0,
            width: 500,
            height: 400,
            fill: "rgba(251, 231, 225, 0.85)",
            rotation: 0,
            opacity: 1,
            zIndex: 1,
            type: "shape",
            draggable: false
          }
        ],

        bgConfig: {
          type: "color",
          value: "rgba(251, 231, 225, 0.85)"
        }
      },

      design: {
        id: "439:22",
        name: "Wedding invitation2",
        type: "FRAME",
        properties: {
          size: { width: 500, height: 400 }
        }
      }
    }
  ],

  Graduation: []
};