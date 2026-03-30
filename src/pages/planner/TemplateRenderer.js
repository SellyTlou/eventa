// components/TemplateRenderer.jsx

import React from "react";

export function TemplateRenderer({ template, eventData }) {
  const populatedTemplate = populateTemplateWithEventData(template, eventData);
  const { data } = populatedTemplate;

  return (
    <div className="template-canvas" style={{ 
      width: `${data.design?.properties?.size?.width || 500}px`,
      height: `${data.design?.properties?.size?.height || 400}px`,
      position: "relative",
      backgroundColor: data.bgConfig?.type === "color" ? data.bgConfig.value : "transparent"
    }}>
      {/* Render background image if exists */}
      {data.bgConfig?.type === "image" && data.bgConfig.value && (
        <img
          src={data.bgConfig.value}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover"
          }}
          alt="background"
        />
      )}

      {/* Render shapes */}
      {data.shapes?.map(shape => (
        <div
          key={shape.id}
          style={{
            position: "absolute",
            left: shape.x,
            top: shape.y,
            width: shape.width,
            height: shape.height,
            backgroundColor: shape.fill !== "transparent" ? shape.fill : undefined,
            borderRadius: shape.shapeType === "circle" ? "50%" : shape.shapeType === "ellipse" ? "50%" : undefined,
            transform: `rotate(${shape.rotation}deg)`,
            opacity: shape.opacity,
            zIndex: shape.zIndex,
            border: shape.stroke ? `${shape.strokeWidth}px solid ${shape.stroke}` : "none"
          }}
        />
      ))}

      {/* Render images */}
      {data.images?.map(image => (
        <img
          key={image.id}
          src={image.src}
          style={{
            position: "absolute",
            left: image.x,
            top: image.y,
            width: image.width,
            height: image.height,
            transform: `rotate(${image.rotation}deg)`,
            opacity: image.opacity,
            zIndex: image.zIndex
          }}
          alt=""
        />
      ))}

      {/* Render text */}
      {data.texts?.map(text => (
        <div
          key={text.id}
          style={{
            position: "absolute",
            left: text.x,
            top: text.y,
            width: text.width,
            fontSize: text.fontSize,
            fontFamily: text.fontFamily,
            fontWeight: text.fontWeight,
            color: text.fill,
            textAlign: text.align,
            transform: `rotate(${text.rotation}deg)`,
            opacity: text.opacity,
            zIndex: text.zIndex,
            whiteSpace: text.wrap === "none" ? "nowrap" : "normal",
            lineHeight: text.lineHeight
          }}
        >
          {text.text.split('\n').map((line, i) => (
            <React.Fragment key={i}>
              {line}
              {i < text.text.split('\n').length - 1 && <br />}
            </React.Fragment>
          ))}
        </div>
      ))}
    </div>
  );
}