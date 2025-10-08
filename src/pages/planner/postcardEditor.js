import React, { useState, useRef, useEffect, useMemo } from "react";
import { Stage, Layer, Rect, Transformer, Circle, Line, Star, Arrow, Text, Image } from "react-konva";
import useImage from "use-image";
import { templates } from "./templates";
import "./postcardEditore.css";
import { v4 as uuidv4 } from "uuid";
import { useSearchParams, useNavigate } from "react-router-dom";


function useHistory(initialState) {
    const [history, setHistory] = useState([initialState]);
    const [index, setIndex] = useState(0);
      

    const state = history[index];

    const setState = (action, overwrite = false) => {
        const newState = typeof action === "function" ? action(state) : action;

        if (overwrite) {
            const historyCopy = [...history];
            historyCopy[index] = newState;
            setHistory(historyCopy);
        } else {
            const updatedHistory = history.slice(0, index + 1);
            setHistory([...updatedHistory, newState]);
            setIndex(updatedHistory.length);
        }
    };

    const undo = () => index > 0 && setIndex(index - 1);
    const redo = () => index < history.length - 1 && setIndex(index + 1);
    const clear = () => {
        setHistory([initialState]);
        setIndex(0);
    };

    return [state, setState, { undo, redo, clear, history, index }];
}

const CornerTransformer = ({ selectedShapeName, ...props }) => {
    const trRef = useRef();

    useEffect(() => {
        if (trRef.current) {
            trRef.current.rotationEnabled(true);

            if (selectedShapeName === "rect") {
                trRef.current.borderRadiusEnabled(true);
                trRef.current.borderStroke("red");
                trRef.current.borderStrokeWidth(2);
            }
        }
    }, [selectedShapeName]);

    return <Transformer ref={trRef} {...props} />;
};

const centerEventTexts = (texts, canvasWidth = 600, canvasHeight = 400) => {
    const eventTexts = texts.filter(text => text.zIndex >= 1000 && text.zIndex <= 1005);
    const otherTexts = texts.filter(text => text.zIndex < 1000 || text.zIndex > 1005);

    if (eventTexts.length === 0) return texts;

    // Sort event texts by zIndex to maintain order
    eventTexts.sort((a, b) => a.zIndex - b.zIndex);

    const spacing = 25;
    let totalHeight = 0;

    // Calculate total height needed
    eventTexts.forEach(text => {
        const approxHeight = text.fontSize * 1.5; // Approximate line height
        totalHeight += approxHeight + spacing;
    });

    totalHeight -= spacing; // Remove last spacing

    const startY = (canvasHeight - totalHeight) / 2;
    let currentY = startY;

    // Update positions to center within canvas
    const recenteredTexts = eventTexts.map(text => {
        const newText = {
            ...text,
            x: canvasWidth / 2,
            y: currentY,
            offsetX: text.width ? text.width / 2 : 0,
            offsetY: text.fontSize ? text.fontSize / 2 : 0
        };

        currentY += text.fontSize * 1.5 + spacing;
        return newText;
    });

    return [...otherTexts, ...recenteredTexts];
};

// Component for draggable text
const DraggableText = ({ textConfig, isSelected, onSelect, onChange }) => {
    const shapeRef = useRef();
    const trRef = useRef();

    React.useEffect(() => {
        if (isSelected && trRef.current && shapeRef.current) {
            trRef.current.nodes([shapeRef.current]);
            trRef.current.getLayer().batchDraw();
        }
    }, [isSelected]);

    return (
        <>
            <Text
                ref={shapeRef}
                {...textConfig}
                draggable
                onClick={onSelect}
                onTap={onSelect}
                onDblClick={onSelect}
                onDragEnd={(e) => {
                    const newX = e.target.x();
                    const newY = e.target.y();
                    onChange({
                        ...textConfig,
                        x: newX,
                        y: newY,
                        // Store the original centered position as offset for reference
                        offsetX: textConfig.offsetX || textConfig.x,
                        offsetY: textConfig.offsetY || textConfig.y
                    });
                }}
                onTransformEnd={() => {
                    const node = shapeRef.current;
                    const scaleX = node.scaleX();
                    const scaleY = node.scaleY();

                    onChange({
                        ...textConfig,
                        x: node.x(),
                        y: node.y(),
                        rotation: node.rotation(),
                        scaleX: 1,
                        scaleY: 1,
                        fontSize: Math.max(8, textConfig.fontSize * scaleY),
                        width: textConfig.width ? textConfig.width * scaleX : undefined
                    });
                }}
                // Center the text properly using offset
                offsetX={textConfig.width ? textConfig.width / 2 : 0}
                offsetY={textConfig.fontSize ? textConfig.fontSize / 2 : 0}
            />
            {isSelected && <Transformer ref={trRef} rotateEnabled={true} />}
        </>
    );
};

// Component for images with transparency
const DraggableImage = ({ imgConfig, isSelected, onSelect, onChange }) => {
    const [image] = useImage(imgConfig.src, "Anonymous");
    const shapeRef = useRef();
    const trRef = useRef();

    React.useEffect(() => {
        if (isSelected && trRef.current && shapeRef.current) {
            trRef.current.nodes([shapeRef.current]);
            trRef.current.getLayer().batchDraw();
        }
    }, [isSelected]);

    return (
        <>
            <Image
                ref={shapeRef}
                image={image}
                {...imgConfig}
                draggable
                onClick={onSelect}
                onTap={onSelect}
                onDblClick={onSelect}
                onDragEnd={(e) =>
                    onChange({
                        ...imgConfig,
                        x: e.target.x(),
                        y: e.target.y(),
                    })
                }
                onTransformEnd={() => {
                    const node = shapeRef.current;
                    const scaleX = node.scaleX();
                    const scaleY = node.scaleY();

                    onChange({
                        ...imgConfig,
                        x: node.x(),
                        y: node.y(),
                        rotation: node.rotation(),
                        width: node.width() * scaleX,
                        height: node.height() * scaleY,
                    });

                    node.scaleX(1);
                    node.scaleY(1);
                }}
            />
            {isSelected && <Transformer ref={trRef} rotateEnabled={true} />}
        </>
    );
};

// Component for shapes with corner editing
const DraggableShape = ({ shapeConfig, isSelected, onSelect, onChange }) => {
    const shapeRef = useRef();
    const trRef = useRef();

    React.useEffect(() => {
        if (isSelected && trRef.current && shapeRef.current) {
            trRef.current.nodes([shapeRef.current]);
            trRef.current.getLayer().batchDraw();
        }
    }, [isSelected]);

    const commonProps = {
        ref: shapeRef,
        ...shapeConfig,
        draggable: true,
        onClick: onSelect,
        onTap: onSelect,
        onDblClick: onSelect,
        onDragEnd: (e) =>
            onChange({
                ...shapeConfig,
                x: e.target.x(),
                y: e.target.y(),
            }),
        onTransformEnd: () => {
            const node = shapeRef.current;
            onChange({
                ...shapeConfig,
                x: node.x(),
                y: node.y(),
                rotation: node.rotation(),
                width: node.width() * node.scaleX(),
                height: node.height() * node.scaleY(),
                scaleX: 1,
                scaleY: 1,
            });
        },
    };

    const renderShape = () => {
        switch (shapeConfig.shapeType) {
            case "rect":
                return <Rect {...commonProps} cornerRadius={shapeConfig.cornerRadius} />;
            case "circle":
                return <Circle {...commonProps} radius={shapeConfig.radius} />;
            case "line":
                return <Line {...commonProps} points={shapeConfig.points} />;
            case "star":
                return <Star {...commonProps} numPoints={shapeConfig.numPoints} innerRadius={shapeConfig.innerRadius} outerRadius={shapeConfig.outerRadius} />;
            case "arrow":
                return <Arrow {...commonProps} points={shapeConfig.points} />;
            default:
                return <Rect {...commonProps} />;
        }
    };

    return (
        <>
            {renderShape()}
            {isSelected && (
                <CornerTransformer
                    ref={trRef}
                    rotateEnabled={true}
                    selectedShapeName={shapeConfig.shapeType}
                />
            )}
        </>
    );
};

const IconElements = ({ addIcon }) => (
    <div className="control-section">
        <h3>Add Icons</h3>
        <div className="icon-grid">
            {/* Date and Time Icons */}
            <button className="icon-btn" onClick={() => addIcon("📅")}>📅 Date</button>
            <button className="icon-btn" onClick={() => addIcon("⏰")}>⏰ Time</button>
            <button className="icon-btn" onClick={() => addIcon("📆")}>📆 Calendar</button>
            <button className="icon-btn" onClick={() => addIcon("🕒")}>🕒 Clock</button>

            {/* Location Icon */}
            <button className="icon-btn" onClick={() => addIcon("📍")}>📍 Location</button>

            {/* Emotion Icons */}
            <button className="icon-btn" onClick={() => addIcon("❤️")}>❤️ Heart</button>
            <button className="icon-btn" onClick={() => addIcon("💕")}>💕 Love</button>
            <button className="icon-btn" onClick={() => addIcon("😊")}>😊 Smile</button>
            <button className="icon-btn" onClick={() => addIcon("🎉")}>🎉 Celebration</button>

            {/* Object Icons */}
            <button className="icon-btn" onClick={() => addIcon("🎁")}>🎁 Gift</button>
            <button className="icon-btn" onClick={() => addIcon("⭐")}>⭐ Star</button>
            <button className="icon-btn" onClick={() => addIcon("🎵")}>🎵 Music</button>
            <button className="icon-btn" onClick={() => addIcon("🍰")}>🍰 Cake</button>
            <button className="icon-btn" onClick={() => addIcon("🎈")}>🎈 Balloon</button>
            <button className="icon-btn" onClick={() => addIcon("💍")}>💍 Ring</button>
        </div>
    </div>
);

const CenterButton = ({ onClick }) => (
    <div className="control-section">
        <button className="center-btn" onClick={onClick}>
            🎯 Center Event Info
        </button>
    </div>
);

// Sidebar component
const Sidebar = ({
    selectedId,
    selectedType,
    texts,
    images,
    shapes,
    setTexts,
    setImages,
    setShapes,
    bgConfig,
    setBgConfig,
    addText,
    addShape,
    addIcon,
    handleImageUpload,
    deleteSelectedItem,
    downloadImage,
    historyActions,
    onCenterEventTexts
}) => {
    const selectedText = selectedType === "text" ? texts.find((t) => t.id === selectedId) : null;
    const selectedImg = selectedType === "image" ? images.find((i) => i.id === selectedId) : null;
    const selectedShape = selectedType === "shape" ? shapes.find((s) => s.id === selectedId) : null;

    return (
        <aside className="editor-sidebar">
            <div className="sidebar-header">
                <h2>Design Tools</h2>
                <div className="history-controls">
                    <button onClick={historyActions.undo} disabled={historyActions.index === 0} className="history-btn">
                        ↶ Undo
                    </button>
                    <button onClick={historyActions.redo} disabled={historyActions.index === historyActions.history.length - 1} className="history-btn">
                        ↷ Redo
                    </button>
                </div>
            </div>

            <div className="sidebar-content">
                {/* Center Button */}
                <CenterButton onClick={onCenterEventTexts} />

                {/* Delete Button */}
                {selectedId && (
                    <div className="control-section">
                        <button className="danger-btn" onClick={deleteSelectedItem}>
                            🗑️ Delete Selected
                        </button>
                    </div>
                )}

                {/* Text Controls */}
                {selectedText && (
                    <TextControls selectedText={selectedText} selectedId={selectedId} setTexts={setTexts} texts={texts} />
                )}

                {/* Image Controls */}
                {selectedImg && (
                    <ImageControls selectedImg={selectedImg} selectedId={selectedId} setImages={setImages} images={images} />
                )}

                {/* Shape Controls */}
                {selectedShape && (
                    <ShapeControls selectedShape={selectedShape} selectedId={selectedId} setShapes={setShapes} shapes={shapes} />
                )}

                {/* Background Controls */}
                <BackgroundControls bgConfig={bgConfig} setBgConfig={setBgConfig} />

                {/* Icon Elements */}
                <IconElements addIcon={addIcon} />

                {/* Add Elements */}
                <AddElements
                    addText={addText}
                    addShape={addShape}
                    handleImageUpload={handleImageUpload}
                />

                {/* Export */}
                <div className="control-section">
                    <button className="save-btn" onClick={downloadImage}>
                        💾 Export Postcard
                    </button>
                </div>
            </div>
        </aside>
    );
};

// Text Controls Component
const TextControls = ({ selectedText, selectedId, setTexts, texts }) => (
    <div className="control-section">
        <h3>Text Settings</h3>
        <label className="control-label">
            Content:
            <input
                type="text"
                value={selectedText.text}
                onChange={(e) =>
                    setTexts(
                        texts.map((t) =>
                            t.id === selectedId ? { ...t, text: e.target.value } : t
                        )
                    )
                }
                className="control-input"
            />
        </label>
        <label className="control-label">
            Font:
            <select
                value={selectedText.fontFamily}
                onChange={(e) =>
                    setTexts(
                        texts.map((t) =>
                            t.id === selectedId ? { ...t, fontFamily: e.target.value } : t
                        )
                    )
                }
                className="control-input"
            >
                <option value="Arial">Arial</option>
                <option value="Times New Roman">Times New Roman</option>
                <option value="Courier New">Courier New</option>
                <option value="Verdana">Verdana</option>
                <option value="Georgia">Georgia</option>
                <option value="Impact">Impact</option>
                <option value="Comic Sans MS">Comic Sans MS</option>
                <option value="Trebuchet MS">Trebuchet MS</option>
                <option value="Palatino">Palatino</option>
                <option value="Garamond">Garamond</option>
                <option value="Brush Script MT">Brush Script MT</option>
                <option value="Tahoma">Tahoma</option>
                <option value="Helvetica">Helvetica</option>
                <option value="Futura">Futura</option>
            </select>
        </label>
        <label className="control-label">
            Color:
            <input
                type="color"
                value={selectedText.fill}
                onChange={(e) =>
                    setTexts(
                        texts.map((t) =>
                            t.id === selectedId ? { ...t, fill: e.target.value } : t
                        )
                    )
                }
            />
        </label>
        <label className="control-label">
            Font Size:
            <input
                type="number"
                min="8"
                max="100"
                value={selectedText.fontSize}
                onChange={(e) =>
                    setTexts(
                        texts.map((t) =>
                            t.id === selectedId
                                ? { ...t, fontSize: Number(e.target.value) }
                                : t
                        )
                    )
                }
                className="control-input"
            />
        </label>
        <label className="control-label">
            Rotation:
            <input
                type="number"
                value={selectedText.rotation}
                onChange={(e) =>
                    setTexts(
                        texts.map((t) =>
                            t.id === selectedId
                                ? { ...t, rotation: Number(e.target.value) }
                                : t
                        )
                    )
                }
                className="control-input"
            />
        </label>
        <label className="control-label">
            Opacity:
            <div className="transparency-slider">
                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={selectedText.opacity}
                    onChange={(e) =>
                        setTexts(
                            texts.map((t) =>
                                t.id === selectedId ? { ...t, opacity: Number(e.target.value) } : t
                            )
                        )
                    }
                />
                <span className="transparency-value">{selectedText.opacity}</span>
            </div>
        </label>
        <h4>Advanced Styling</h4>
        <label className="control-label">
            Shadow Color:
            <input
                type="color"
                value={selectedText.shadowColor}
                onChange={(e) =>
                    setTexts(
                        texts.map((t) =>
                            t.id === selectedId ? { ...t, shadowColor: e.target.value } : t
                        )
                    )
                }
            />
        </label>
        <label className="control-label">
            Shadow Blur:
            <input
                type="range"
                min="0"
                max="50"
                value={selectedText.shadowBlur}
                onChange={(e) =>
                    setTexts(
                        texts.map((t) =>
                            t.id === selectedId ? { ...t, shadowBlur: Number(e.target.value) } : t
                        )
                    )
                }
            />
        </label>
        <label className="control-label">
            Shadow Offset X:
            <input
                type="range"
                min="-20"
                max="20"
                value={selectedText.shadowOffsetX}
                onChange={(e) =>
                    setTexts(
                        texts.map((t) =>
                            t.id === selectedId ? { ...t, shadowOffsetX: Number(e.target.value) } : t
                        )
                    )
                }
            />
        </label>
        <label className="control-label">
            Shadow Offset Y:
            <input
                type="range"
                min="-20"
                max="20"
                value={selectedText.shadowOffsetY}
                onChange={(e) =>
                    setTexts(
                        texts.map((t) =>
                            t.id === selectedId ? { ...t, shadowOffsetY: Number(e.target.value) } : t
                        )
                    )
                }
            />
        </label>
        <label className="control-label">
            Shadow Opacity:
            <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={selectedText.shadowOpacity}
                onChange={(e) =>
                    setTexts(
                        texts.map((t) =>
                            t.id === selectedId ? { ...t, shadowOpacity: Number(e.target.value) } : t
                        )
                    )
                }
            />
        </label>
        <label className="control-label">
            Stroke Color:
            <input
                type="color"
                value={selectedText.stroke || ""}
                onChange={(e) =>
                    setTexts(
                        texts.map((t) =>
                            t.id === selectedId ? { ...t, stroke: e.target.value } : t
                        )
                    )
                }
            />
        </label>
        <label className="control-label">
            Stroke Width:
            <input
                type="number"
                min="0"
                max="10"
                value={selectedText.strokeWidth || 0}
                onChange={(e) =>
                    setTexts(
                        texts.map((t) =>
                            t.id === selectedId ? { ...t, strokeWidth: Number(e.target.value) } : t
                        )
                    )
                }
                className="control-input"
            />
        </label>
    </div>
);

// Image Controls Component
const ImageControls = ({ selectedImg, selectedId, setImages, images }) => (
    <div className="control-section">
        <h3>Image Settings</h3>
        <label className="control-label">
            Rotation:
            <input
                type="number"
                value={selectedImg.rotation}
                onChange={(e) =>
                    setImages(
                        images.map((i) =>
                            i.id === selectedId
                                ? { ...i, rotation: Number(e.target.value) }
                                : i
                        )
                    )
                }
                className="control-input"
            />
        </label>
        <label className="control-label">
            Opacity:
            <div className="transparency-slider">
                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={selectedImg.opacity}
                    onChange={(e) =>
                        setImages(
                            images.map((i) =>
                                i.id === selectedId ? { ...i, opacity: Number(e.target.value) } : i
                            )
                        )
                    }
                />
                <span className="transparency-value">{selectedImg.opacity}</span>
            </div>
        </label>
        <h4>Advanced Styling</h4>
        <label className="control-label">
            Shadow Color:
            <input
                type="color"
                value={selectedImg.shadowColor}
                onChange={(e) =>
                    setImages(
                        images.map((i) =>
                            i.id === selectedId ? { ...i, shadowColor: e.target.value } : i
                        )
                    )
                }
            />
        </label>
        <label className="control-label">
            Shadow Blur:
            <input
                type="range"
                min="0"
                max="50"
                value={selectedImg.shadowBlur}
                onChange={(e) =>
                    setImages(
                        images.map((i) =>
                            i.id === selectedId ? { ...i, shadowBlur: Number(e.target.value) } : i
                        )
                    )
                }
            />
        </label>
        <label className="control-label">
            Shadow Offset X:
            <input
                type="range"
                min="-20"
                max="20"
                value={selectedImg.shadowOffsetX}
                onChange={(e) =>
                    setImages(
                        images.map((i) =>
                            i.id === selectedId ? { ...i, shadowOffsetX: Number(e.target.value) } : i
                        )
                    )
                }
            />
        </label>
        <label className="control-label">
            Shadow Offset Y:
            <input
                type="range"
                min="-20"
                max="20"
                value={selectedImg.shadowOffsetY}
                onChange={(e) =>
                    setImages(
                        images.map((i) =>
                            i.id === selectedId ? { ...i, shadowOffsetY: Number(e.target.value) } : i
                        )
                    )
                }
            />
        </label>
        <label className="control-label">
            Shadow Opacity:
            <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={selectedImg.shadowOpacity}
                onChange={(e) =>
                    setImages(
                        images.map((i) =>
                            i.id === selectedId ? { ...i, shadowOpacity: Number(e.target.value) } : i
                        )
                    )
                }
            />
        </label>
        <label className="control-label">
            Corner Radius:
            <input
                type="range"
                min="0"
                max="50"
                value={selectedImg.cornerRadius || 0}
                onChange={(e) =>
                    setImages(
                        images.map((i) =>
                            i.id === selectedId ? { ...i, cornerRadius: Number(e.target.value) } : i
                        )
                    )
                }
            />
        </label>
        <label className="control-label">
            Stroke Color:
            <input
                type="color"
                value={selectedImg.stroke || ""}
                onChange={(e) =>
                    setImages(
                        images.map((i) =>
                            i.id === selectedId ? { ...i, stroke: e.target.value } : i
                        )
                    )
                }
            />
        </label>
        <label className="control-label">
            Stroke Width:
            <input
                type="number"
                min="0"
                max="10"
                value={selectedImg.strokeWidth || 0}
                onChange={(e) =>
                    setImages(
                        images.map((i) =>
                            i.id === selectedId ? { ...i, strokeWidth: Number(e.target.value) } : i
                        )
                    )
                }
                className="control-input"
            />
        </label>
    </div>
);

// Shape Controls Component
const ShapeControls = ({ selectedShape, selectedId, setShapes, shapes }) => (
    <div className="control-section">
        <h3>Shape Settings</h3>
        <label className="control-label">
            Fill Color:
            <input
                type="color"
                value={selectedShape.fill}
                onChange={(e) =>
                    setShapes(
                        shapes.map((s) =>
                            s.id === selectedId ? { ...s, fill: e.target.value } : s
                        )
                    )
                }
            />
        </label>
        <label className="control-label">
            Rotation:
            <input
                type="number"
                value={selectedShape.rotation}
                onChange={(e) =>
                    setShapes(
                        shapes.map((s) =>
                            s.id === selectedId
                                ? { ...s, rotation: Number(e.target.value) }
                                : s
                        )
                    )
                }
                className="control-input"
            />
        </label>
        <label className="control-label">
            Opacity:
            <div className="transparency-slider">
                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={selectedShape.opacity}
                    onChange={(e) =>
                        setShapes(
                            shapes.map((s) =>
                                s.id === selectedId ? { ...s, opacity: Number(e.target.value) } : s
                            )
                        )
                    }
                />
                <span className="transparency-value">{selectedShape.opacity}</span>
            </div>
        </label>

        {selectedShape.shapeType === "rect" && (
            <>
                <h4>Individual Corner Radius</h4>
                <label className="control-label">
                    Top Left:
                    <input
                        type="range"
                        min="0"
                        max="50"
                        value={selectedShape.cornerRadius?.[0] || 0}
                        onChange={(e) => {
                            const newRadius = Array.isArray(selectedShape.cornerRadius)
                                ? [...selectedShape.cornerRadius]
                                : [0, 0, 0, 0];
                            newRadius[0] = Number(e.target.value);
                            setShapes(
                                shapes.map((s) =>
                                    s.id === selectedId ? { ...s, cornerRadius: newRadius } : s
                                )
                            );
                        }}
                    />
                </label>
                <label className="control-label">
                    Top Right:
                    <input
                        type="range"
                        min="0"
                        max="50"
                        value={selectedShape.cornerRadius?.[1] || 0}
                        onChange={(e) => {
                            const newRadius = Array.isArray(selectedShape.cornerRadius)
                                ? [...selectedShape.cornerRadius]
                                : [0, 0, 0, 0];
                            newRadius[1] = Number(e.target.value);
                            setShapes(
                                shapes.map((s) =>
                                    s.id === selectedId ? { ...s, cornerRadius: newRadius } : s
                                )
                            );
                        }}
                    />
                </label>
                <label className="control-label">
                    Bottom Right:
                    <input
                        type="range"
                        min="0"
                        max="50"
                        value={selectedShape.cornerRadius?.[2] || 0}
                        onChange={(e) => {
                            const newRadius = Array.isArray(selectedShape.cornerRadius)
                                ? [...selectedShape.cornerRadius]
                                : [0, 0, 0, 0];
                            newRadius[2] = Number(e.target.value);
                            setShapes(
                                shapes.map((s) =>
                                    s.id === selectedId ? { ...s, cornerRadius: newRadius } : s
                                )
                            );
                        }}
                    />
                </label>
                <label className="control-label">
                    Bottom Left:
                    <input
                        type="range"
                        min="0"
                        max="50"
                        value={selectedShape.cornerRadius?.[3] || 0}
                        onChange={(e) => {
                            const newRadius = Array.isArray(selectedShape.cornerRadius)
                                ? [...selectedShape.cornerRadius]
                                : [0, 0, 0, 0];
                            newRadius[3] = Number(e.target.value);
                            setShapes(
                                shapes.map((s) =>
                                    s.id === selectedId ? { ...s, cornerRadius: newRadius } : s
                                )
                            );
                        }}
                    />
                </label>
                <label className="control-label">
                    Width:
                    <input
                        type="number"
                        value={selectedShape.width}
                        onChange={(e) =>
                            setShapes(
                                shapes.map((s) =>
                                    s.id === selectedId ? { ...s, width: Number(e.target.value) } : s
                                )
                            )
                        }
                        className="control-input"
                    />
                </label>
                <label className="control-label">
                    Height:
                    <input
                        type="number"
                        value={selectedShape.height}
                        onChange={(e) =>
                            setShapes(
                                shapes.map((s) =>
                                    s.id === selectedId ? { ...s, height: Number(e.target.value) } : s
                                )
                            )
                        }
                        className="control-input"
                    />
                </label>
            </>
        )}
        {selectedShape.shapeType === "circle" && (
            <label className="control-label">
                Radius:
                <input
                    type="number"
                    value={selectedShape.radius}
                    onChange={(e) =>
                        setShapes(
                            shapes.map((s) =>
                                s.id === selectedId ? { ...s, radius: Number(e.target.value) } : s
                            )
                        )
                    }
                    className="control-input"
                />
            </label>
        )}
        {selectedShape.shapeType === "line" && (
            <>
                <label className="control-label">
                    Start X:
                    <input
                        type="number"
                        value={selectedShape.points[0]}
                        onChange={(e) => {
                            const newPoints = [...selectedShape.points];
                            newPoints[0] = Number(e.target.value);
                            setShapes(
                                shapes.map((s) =>
                                    s.id === selectedId ? { ...s, points: newPoints } : s
                                )
                            );
                        }}
                        className="control-input"
                    />
                </label>
                <label className="control-label">
                    Start Y:
                    <input
                        type="number"
                        value={selectedShape.points[1]}
                        onChange={(e) => {
                            const newPoints = [...selectedShape.points];
                            newPoints[1] = Number(e.target.value);
                            setShapes(
                                shapes.map((s) =>
                                    s.id === selectedId ? { ...s, points: newPoints } : s
                                )
                            );
                        }}
                        className="control-input"
                    />
                </label>
                <label className="control-label">
                    End X:
                    <input
                        type="number"
                        value={selectedShape.points[2]}
                        onChange={(e) => {
                            const newPoints = [...selectedShape.points];
                            newPoints[2] = Number(e.target.value);
                            setShapes(
                                shapes.map((s) =>
                                    s.id === selectedId ? { ...s, points: newPoints } : s
                                )
                            );
                        }}
                        className="control-input"
                    />
                </label>
                <label className="control-label">
                    End Y:
                    <input
                        type="number"
                        value={selectedShape.points[3]}
                        onChange={(e) => {
                            const newPoints = [...selectedShape.points];
                            newPoints[3] = Number(e.target.value);
                            setShapes(
                                shapes.map((s) =>
                                    s.id === selectedId ? { ...s, points: newPoints } : s
                                )
                            );
                        }}
                        className="control-input"
                    />
                </label>
                <label className="control-label">
                    Stroke Width:
                    <input
                        type="number"
                        min="1"
                        max="20"
                        value={selectedShape.strokeWidth}
                        onChange={(e) =>
                            setShapes(
                                shapes.map((s) =>
                                    s.id === selectedId ? { ...s, strokeWidth: Number(e.target.value) } : s
                                )
                            )
                        }
                        className="control-input"
                    />
                </label>
            </>
        )}
        {selectedShape.shapeType === "star" && (
            <>
                <label className="control-label">
                    Inner Radius:
                    <input
                        type="number"
                        value={selectedShape.innerRadius}
                        onChange={(e) =>
                            setShapes(
                                shapes.map((s) =>
                                    s.id === selectedId ? { ...s, innerRadius: Number(e.target.value) } : s
                                )
                            )
                        }
                        className="control-input"
                    />
                </label>
                <label className="control-label">
                    Outer Radius:
                    <input
                        type="number"
                        value={selectedShape.outerRadius}
                        onChange={(e) =>
                            setShapes(
                                shapes.map((s) =>
                                    s.id === selectedId ? { ...s, outerRadius: Number(e.target.value) } : s
                                )
                            )
                        }
                        className="control-input"
                    />
                </label>
                <label className="control-label">
                    Points:
                    <input
                        type="number"
                        min="3"
                        max="20"
                        value={selectedShape.numPoints}
                        onChange={(e) =>
                            setShapes(
                                shapes.map((s) =>
                                    s.id === selectedId ? { ...s, numPoints: Number(e.target.value) } : s
                                )
                            )
                        }
                        className="control-input"
                    />
                </label>
            </>
        )}
        {selectedShape.shapeType === "arrow" && (
            <>
                <label className="control-label">
                    Start X:
                    <input
                        type="number"
                        value={selectedShape.points[0]}
                        onChange={(e) => {
                            const newPoints = [...selectedShape.points];
                            newPoints[0] = Number(e.target.value);
                            setShapes(
                                shapes.map((s) =>
                                    s.id === selectedId ? { ...s, points: newPoints } : s
                                )
                            );
                        }}
                        className="control-input"
                    />
                </label>
                <label className="control-label">
                    Start Y:
                    <input
                        type="number"
                        value={selectedShape.points[1]}
                        onChange={(e) => {
                            const newPoints = [...selectedShape.points];
                            newPoints[1] = Number(e.target.value);
                            setShapes(
                                shapes.map((s) =>
                                    s.id === selectedId ? { ...s, points: newPoints } : s
                                )
                            );
                        }}
                        className="control-input"
                    />
                </label>
                <label className="control-label">
                    End X:
                    <input
                        type="number"
                        value={selectedShape.points[2]}
                        onChange={(e) => {
                            const newPoints = [...selectedShape.points];
                            newPoints[2] = Number(e.target.value);
                            setShapes(
                                shapes.map((s) =>
                                    s.id === selectedId ? { ...s, points: newPoints } : s
                                )
                            );
                        }}
                        className="control-input"
                    />
                </label>
                <label className="control-label">
                    End Y:
                    <input
                        type="number"
                        value={selectedShape.points[3]}
                        onChange={(e) => {
                            const newPoints = [...selectedShape.points];
                            newPoints[3] = Number(e.target.value);
                            setShapes(
                                shapes.map((s) =>
                                    s.id === selectedId ? { ...s, points: newPoints } : s
                                )
                            );
                        }}
                        className="control-input"
                    />
                </label>
                <label className="control-label">
                    Pointer Length:
                    <input
                        type="number"
                        min="5"
                        max="30"
                        value={selectedShape.pointerLength || 10}
                        onChange={(e) =>
                            setShapes(
                                shapes.map((s) =>
                                    s.id === selectedId ? { ...s, pointerLength: Number(e.target.value) } : s
                                )
                            )
                        }
                        className="control-input"
                    />
                </label>
                <label className="control-label">
                    Pointer Width:
                    <input
                        type="number"
                        min="5"
                        max="30"
                        value={selectedShape.pointerWidth || 10}
                        onChange={(e) =>
                            setShapes(
                                shapes.map((s) =>
                                    s.id === selectedId ? { ...s, pointerWidth: Number(e.target.value) } : s
                                )
                            )
                        }
                        className="control-input"
                    />
                </label>
            </>
        )}
        <h4>Advanced Styling</h4>
        <label className="control-label">
            Shadow Color:
            <input
                type="color"
                value={selectedShape.shadowColor}
                onChange={(e) =>
                    setShapes(
                        shapes.map((s) =>
                            s.id === selectedId ? { ...s, shadowColor: e.target.value } : s
                        )
                    )
                }
            />
        </label>
        <label className="control-label">
            Shadow Blur:
            <input
                type="range"
                min="0"
                max="50"
                value={selectedShape.shadowBlur}
                onChange={(e) =>
                    setShapes(
                        shapes.map((s) =>
                            s.id === selectedId ? { ...s, shadowBlur: Number(e.target.value) } : s
                        )
                    )
                }
            />
        </label>
        <label className="control-label">
            Shadow Offset X:
            <input
                type="range"
                min="-20"
                max="20"
                value={selectedShape.shadowOffsetX}
                onChange={(e) =>
                    setShapes(
                        shapes.map((s) =>
                            s.id === selectedId ? { ...s, shadowOffsetX: Number(e.target.value) } : s
                        )
                    )
                }
            />
        </label>
        <label className="control-label">
            Shadow Offset Y:
            <input
                type="range"
                min="-20"
                max="20"
                value={selectedShape.shadowOffsetY}
                onChange={(e) =>
                    setShapes(
                        shapes.map((s) =>
                            s.id === selectedId ? { ...s, shadowOffsetY: Number(e.target.value) } : s
                        )
                    )
                }
            />
        </label>
        <label className="control-label">
            Shadow Opacity:
            <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={selectedShape.shadowOpacity}
                onChange={(e) =>
                    setShapes(
                        shapes.map((s) =>
                            s.id === selectedId ? { ...s, shadowOpacity: Number(e.target.value) } : s
                        )
                    )
                }
            />
        </label>
        <label className="control-label">
            Stroke Color:
            <input
                type="color"
                value={selectedShape.stroke || ""}
                onChange={(e) =>
                    setShapes(
                        shapes.map((s) =>
                            s.id === selectedId ? { ...s, stroke: e.target.value } : s
                        )
                    )
                }
            />
        </label>
        <label className="control-label">
            Stroke Width:
            <input
                type="number"
                min="0"
                max="10"
                value={selectedShape.strokeWidth || 0}
                onChange={(e) =>
                    setShapes(
                        shapes.map((s) =>
                            s.id === selectedId ? { ...s, strokeWidth: Number(e.target.value) } : s
                        )
                    )
                }
                className="control-input"
            />
        </label>
    </div>
);

// Background Controls Component
const BackgroundControls = ({ bgConfig, setBgConfig }) => (
    <div className="control-section">
        <h3>Background</h3>
        <label className="control-label">
            Color:
            <input
                type="color"
                value={bgConfig.type === "color" ? bgConfig.value : "#ffffff"}
                onChange={(e) => setBgConfig({ type: "color", value: e.target.value })}
            />
        </label>
        <label className="control-label">
            Upload Image:
            <input type="file" accept="image/*" onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                    setBgConfig({ type: "image", value: URL.createObjectURL(file) });
                }
            }} className="control-input" />
        </label>
        <button
            className="remove-bg-btn"
            onClick={() => setBgConfig({ type: "color", value: "#ffffff" })}
        >
            Remove Background
        </button>
    </div>
);

// Add Elements Component
const AddElements = ({ addText, addShape, handleImageUpload }) => (
    <div className="control-section">
        <h3>Add Elements</h3>
        <button onClick={addText} className="add-btn">➕ Add Text</button>
        <label className="upload-btn">
            📁 Upload Image
            <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
        </label>
        <div className="shape-buttons">
            <button onClick={() => addShape("rect")} className="shape-btn">⬛ Rectangle</button>
            <button onClick={() => addShape("circle")} className="shape-btn">⚪ Circle</button>
            <button onClick={() => addShape("line")} className="shape-btn">➖ Line</button>
            <button onClick={() => addShape("star")} className="shape-btn">⭐ Star</button>
            <button onClick={() => addShape("arrow")} className="shape-btn">➡️ Arrow</button>
        </div>
    </div>
);

// Right Sidebar Component
const RightSidebar = ({
    elements,
    selectedId,
    setSelectedId,
    setSelectedType,
    updateElementZIndex
}) => (
    <aside className="right-sidebar">
        <h3>Layers</h3>
        <div className="layers-list">
            {elements.map((element, index) => (
                <div
                    key={element.id}
                    className={`layer-item ${selectedId === element.id ? 'selected' : ''}`}
                    onClick={() => {
                        setSelectedId(element.id);
                        setSelectedType(element.type);
                    }}
                >
                    <div className="layer-info">
                        <span className="layer-icon">
                            {element.type === 'text' ? 'T' : element.type === 'image' ? '🖼️' : '🔷'}
                        </span>
                        <span className="layer-name">
                            {element.type === 'text' ? element.text : `${element.type} ${index + 1}`}
                        </span>
                    </div>
                    <div className="layer-actions">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                updateElementZIndex(element.id, element.type, 'up');
                            }}
                            disabled={index === elements.length - 1}
                            className="layer-action-btn"
                        >
                            ↑
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                updateElementZIndex(element.id, element.type, 'down');
                            }}
                            disabled={index === 0}
                            className="layer-action-btn"
                        >
                            ↓
                        </button>
                    </div>
                </div>
            ))}
        </div>
    </aside>
);
// Function to get event data from localStorage
const getEventDataFromStorage = () => {
    try {
        const deviceId = localStorage.getItem('eventa_device_id');
        if (!deviceId) return null;

        const eventDataKey = `eventa_${deviceId}_current_event`;
        const data = localStorage.getItem(eventDataKey);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('Error retrieving event data:', error);
        return null;
    }
};

// Function to create text elements from event data
const createEventTextElements = (eventData) => {
    if (!eventData) return [];

    const elements = [];
    const canvasWidth = 600;
    const canvasHeight = 700;
    const spacing = 25;

    let totalHeight = 0;
    if (eventData.eventName) totalHeight += 35;
    if (eventData.eventStartDate) totalHeight += 22;
    if (eventData.eventStartTime) totalHeight += 20;
    if (eventData.eventEndDate) totalHeight += 22;
    if (eventData.eventEndTime) totalHeight += 20;
    if (eventData.eventLocation) totalHeight += 20;
    totalHeight += spacing * 5;

    const startY = (canvasHeight - totalHeight) / 2;
    let currentY = startY;

    // Event Name
    if (eventData.eventName) {
        elements.push({
            id: uuidv4(),
            text: eventData.eventName,
            x: canvasWidth / 2,
            y: currentY,
            fontSize: 60,
            fontFamily: "Bebas Neue, sans-serif",
            fill: "#000000",
            fontStyle: "bolder",
            align: "center",
            rotation: 0,
            opacity: 1,
            zIndex: 1000,
            shadowColor: "rgba(0, 0, 0, 0.3)",
            shadowBlur: 5,
            shadowOffsetX: 2,
            shadowOffsetY: 2,
            shadowOpacity: 0.8,
            type: "text",
            width: canvasWidth - 40,
            wrap: "word"

        });
        currentY += 45;
    }

    // Start Date
    if (eventData.eventStartDate) {
        elements.push({
            id: uuidv4(),
            text: `📅 ${eventData.eventStartDate}`,
            x: canvasWidth / 2,
            y: currentY,
            fontSize: 20,
            fontFamily: "Poppins, sans-serif",
            fill: "#444444",
            align: "center",
            rotation: 0,
            opacity: 1,
            zIndex: 1001,
            type: "text",
            wrap: "word"
        });
        currentY += spacing + 5;
    }

    // Start Time
    if (eventData.eventStartTime) {
        elements.push({
            id: uuidv4(),
            text: `⏰ ${eventData.eventStartTime}`,
            x: canvasWidth / 2,
            y: currentY,
            fontSize: 18,
            fontFamily: "Poppins, sans-serif",
            fill: "#555555",
            align: "center",
            rotation: 0,
            opacity: 1,
            zIndex: 1002,
            type: "text",
            wrap: "word"
        });
        currentY += spacing;
    }

    // End Date (if different from start date)
    if (eventData.eventEndDate && eventData.eventEndDate !== eventData.eventStartDate) {
        elements.push({
            id: uuidv4(),
            text: `📅 ${eventData.eventEndDate}`,
            x: canvasWidth / 2,
            y: currentY,
            fontSize: 20,
            fontFamily: "Poppins, sans-serif",
            fill: "#444444",
            align: "center",
            rotation: 0,
            opacity: 1,
            zIndex: 1003,
            type: "text",
            wrap: "word"
        });
        currentY += spacing + 5;
    }

    // End Time (if different from start time)
    if (eventData.eventEndTime && eventData.eventEndTime !== eventData.eventStartTime) {
        elements.push({
            id: uuidv4(),
            text: `⏰ ${eventData.eventEndTime}`,
            x: canvasWidth / 2,
            y: currentY,
            fontSize: 18,
            fontFamily: "Poppins, sans-serif",
            fill: "#555555",
            align: "center",
            rotation: 0,
            opacity: 1,
            zIndex: 1004,
            type: "text",
            wrap: "word"
        });
        currentY += spacing;
    }

    // Location
    if (eventData.eventLocation) {
        elements.push({
            id: uuidv4(),
            text: `📍 ${eventData.eventLocation}`,
            x: canvasWidth / 2,
            y: currentY,
            fontSize: 18,
            fontFamily: "Poppins, sans-serif",
            fill: "#555555",
            align: "center",
            rotation: 0,
            opacity: 1,
            zIndex: 1005,
            type: "text",
            wrap: "word"
        });
    }

    return elements;
};



export default function PostcardEditor() {
    const [searchParams] = useSearchParams();
    const templateId = searchParams.get("template");
    const category = searchParams.get("category");
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    // Get templates for the given category
    const categoryTemplates = templates[category] || [];

    // Find the one with matching ID
    const template = useMemo(() => {
        return categoryTemplates.find((t) => t.id === templateId) || categoryTemplates[0];
    }, [templateId, categoryTemplates]);

    // Use history hook for undo/redo functionality
    const [state, setState, historyActions] = useHistory({
        texts: [],
        images: [],
        shapes: [],
        bgConfig: { type: "image", value: template?.image || "/images/default-bg.jpg" },
    });

    const { texts, images, shapes, bgConfig } = state;

    const [selectedId, setSelectedId] = useState(null);
    const [selectedType, setSelectedType] = useState(null);
    const stageRef = useRef();

    const [bgImage] = useImage(
        bgConfig.type === "image" ? bgConfig.value : null,
        "Anonymous"
    );

    // Load event data from localStorage and create text elements on component mount
    useEffect(() => {
        const eventData = getEventDataFromStorage();
        if (eventData) {
            const eventTextElements = createEventTextElements(eventData);
            if (eventTextElements.length > 0) {
                // Add event text elements to the texts array
                setState(prev => ({
                    ...prev,
                    texts: [...prev.texts, ...eventTextElements]
                }));
            }
        }
    }, []);

    // Update state with history tracking
    const updateState = (newState) => {
        setState((prev) => ({ ...prev, ...newState }));
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const newImage = {
                id: uuidv4(),
                src: URL.createObjectURL(file),
                x: 50,
                y: 50,
                width: 100,
                height: 100,
                rotation: 0,
                opacity: 1,
                zIndex: images.length + texts.length + shapes.length,
                shadowColor: "#000000",
                shadowBlur: 0,
                shadowOffsetX: 0,
                shadowOffsetY: 0,
                shadowOpacity: 0.5,
                cornerRadius: 0,
                stroke: "",
                strokeWidth: 0,
            };
            updateState({ images: [...images, newImage] });
            setSelectedId(newImage.id);
            setSelectedType("image");
        }
    };

    const addText = () => {
        const newText = {
            id: uuidv4(),
            text: "New Text",
            x: 100,
            y: 100,
            fontSize: 24,
            fontFamily: "Arial",
            fill: "#000000",
            rotation: 0,
            opacity: 1,
            curve: 0,
            zIndex: images.length + texts.length + shapes.length,
            shadowColor: "#000000",
            shadowBlur: 0,
            shadowOffsetX: 0,
            shadowOffsetY: 0,
            shadowOpacity: 0.5,
            cornerRadius: 0,
            stroke: "",
            strokeWidth: 0,
        };
        updateState({ texts: [...texts, newText] });
        setSelectedId(newText.id);
        setSelectedType("text");
    };

    const addShape = (shapeType) => {
        let newShape;
        switch (shapeType) {
            case "rect":
                newShape = {
                    id: uuidv4(),
                    shapeType: "rect",
                    x: 150,
                    y: 150,
                    width: 100,
                    height: 70,
                    fill: "#ff5722",
                    rotation: 0,
                    opacity: 1,
                    zIndex: images.length + texts.length + shapes.length,
                    shadowColor: "#000000",
                    shadowBlur: 0,
                    shadowOffsetX: 0,
                    shadowOffsetY: 0,
                    shadowOpacity: 0.5,
                    cornerRadius: [0, 0, 0, 0], // Individual corner radius
                    stroke: "",
                    strokeWidth: 0,
                };
                break;
            case "circle":
                newShape = {
                    id: uuidv4(),
                    shapeType: "circle",
                    x: 150,
                    y: 150,
                    radius: 50,
                    fill: "#2196f3",
                    rotation: 0,
                    opacity: 1,
                    zIndex: images.length + texts.length + shapes.length,
                    shadowColor: "#000000",
                    shadowBlur: 0,
                    shadowOffsetX: 0,
                    shadowOffsetY: 0,
                    shadowOpacity: 0.5,
                    stroke: "",
                    strokeWidth: 0,
                };
                break;
            case "line":
                newShape = {
                    id: uuidv4(),
                    shapeType: "line",
                    x: 150,
                    y: 150,
                    points: [0, 0, 100, 0], // Straight line
                    stroke: "#4caf50",
                    strokeWidth: 4,
                    rotation: 0,
                    opacity: 1,
                    zIndex: images.length + texts.length + shapes.length,
                    shadowColor: "#000000",
                    shadowBlur: 0,
                    shadowOffsetX: 0,
                    shadowOffsetY: 0,
                    shadowOpacity: 0.5,
                };
                break;
            case "star":
                newShape = {
                    id: uuidv4(),
                    shapeType: "star",
                    x: 150,
                    y: 150,
                    numPoints: 5,
                    innerRadius: 30,
                    outerRadius: 50,
                    fill: "#ffeb3b",
                    rotation: 0,
                    opacity: 1,
                    zIndex: images.length + texts.length + shapes.length,
                    shadowColor: "#000000",
                    shadowBlur: 0,
                    shadowOffsetX: 0,
                    shadowOffsetY: 0,
                    shadowOpacity: 0.5,
                    stroke: "",
                    strokeWidth: 0,
                };
                break;
            case "arrow":
                newShape = {
                    id: uuidv4(),
                    shapeType: "arrow",
                    x: 150,
                    y: 150,
                    points: [0, 0, 100, 0], // Straight arrow
                    pointerLength: 10,
                    pointerWidth: 10,
                    fill: "#9c27b0",
                    stroke: "#9c27b0",
                    strokeWidth: 4,
                    rotation: 0,
                    opacity: 1,
                    zIndex: images.length + texts.length + shapes.length,
                    shadowColor: "#000000",
                    shadowBlur: 0,
                    shadowOffsetX: 0,
                    shadowOffsetY: 0,
                    shadowOpacity: 0.5,
                };
                break;
            default:
                return;
        }
        updateState({ shapes: [...shapes, newShape] });
        setSelectedId(newShape.id);
        setSelectedType("shape");
    };

    const deleteSelectedItem = () => {
        if (selectedId && selectedType) {
            switch (selectedType) {
                case "text":
                    updateState({ texts: texts.filter((t) => t.id !== selectedId) });
                    break;
                case "image":
                    updateState({ images: images.filter((i) => i.id !== selectedId) });
                    break;
                case "shape":
                    updateState({ shapes: shapes.filter((s) => s.id !== selectedId) });
                    break;
                default:
                    break;
            }
            setSelectedId(null);
            setSelectedType(null);
        }
    };

    const saveEventToDatabase = async (imageData) => {
        try {
            setLoading(true);
            const user = JSON.parse(localStorage.getItem("user"));
            const eventData = getEventDataFromStorage();

            if (!user || !eventData) {
                alert("User or event data not found. Please try again.");
                                setLoading(false);
                return false;
            }

            const formData = new FormData();
            formData.append("function", "saveEvent");
            formData.append("userID", user.user_id);
            formData.append("userName", user.name);
            formData.append("eventID", eventData.eventID || uuidv4());
            formData.append("eventName", eventData.eventName || "");
            formData.append("eventStartDate", eventData.eventStartDate || "");
            formData.append("eventStartTime", eventData.eventStartTime || "");
            formData.append("eventEndDate", eventData.eventEndDate || "");
            formData.append("eventEndTime", eventData.eventEndTime || "");
            formData.append("eventLocation", eventData.eventLocation || "");
            formData.append("eventUrlImage", imageData); // Base64 image data
            formData.append("eventDesignData", JSON.stringify({
                texts,
                images,
                shapes,
                bgConfig
            }));
            const API_URL = process.env.REACT_APP_API_URL;

            const response = await fetch(`${API_URL}/query.php`, {
                method: "POST",
                body: formData,
            });

            const result = await response.json();

            if (result.success) {
                alert("Event saved successfully!");
                return true;
            } else {
                alert("Failed to save event: " + result.message);
                return false;
            }
        } catch (error) {
            console.error("Error saving event:", error);
            alert("Error saving event. Please try again.");
            return false;
        }finally {
                setLoading(false);
            }
    };

    const downloadImage = async () => {
        setSelectedId(null);
        setSelectedType(null);

        setTimeout(async () => {
            if (!stageRef.current) {
                console.error("Stage reference is not available");
                return;
            }

            try {
                const uri = stageRef.current.toDataURL({
                    pixelRatio: 2,
                    quality: 1,
                    mimeType: 'image/png'
                });

                const success = await saveEventToDatabase(uri);

                if (success) {
                    const confirmDownload = window.confirm("Event saved successfully! Would you like to download the image as well?");
                    if (confirmDownload) {
                        const link = document.createElement("a");
                        link.download = `${templateId || 'postcard'}-design.png`;
                        link.href = uri;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                    }
                    goToEventDashboard();
                }
            } catch (error) {
                console.error("Error processing image:", error);
                alert("Failed to process image. Please try again.");
            }
        }, 100);
    };

    const goToEventDashboard = () => {
        navigate("/eventsDashboard");
    };
    // Handle canvas click to select/deselect elements
    const handleCanvasClick = (e) => {
        const clickedOnEmpty = e.target === e.target.getStage();
        if (clickedOnEmpty) {
            setSelectedId(null);
            setSelectedType(null);
            return;
        }

        // Find which element was clicked
        const clickedElementId = e.target.attrs.id;
        if (!clickedElementId) return;

        // Check if it's a text element
        const textElement = texts.find(t => t.id === clickedElementId);
        if (textElement) {
            setSelectedId(clickedElementId);
            setSelectedType("text");
            return;
        }

        // Check if it's an image element
        const imageElement = images.find(i => i.id === clickedElementId);
        if (imageElement) {
            setSelectedId(clickedElementId);
            setSelectedType("image");
            return;
        }

        // Check if it's a shape element
        const shapeElement = shapes.find(s => s.id === clickedElementId);
        if (shapeElement) {
            setSelectedId(clickedElementId);
            setSelectedType("shape");
            return;
        }

        // If no element found, deselect
        setSelectedId(null);
        setSelectedType(null);
    };

    // Update z-index of elements
    const updateElementZIndex = (id, type, direction) => {
        const allElements = [
            ...texts.map((t) => ({ ...t, type: "text" })),
            ...images.map((i) => ({ ...i, type: "image" })),
            ...shapes.map((s) => ({ ...s, type: "shape" })),
        ].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

        const elementIndex = allElements.findIndex(el => el.id === id);

        if ((direction === 'up' && elementIndex === allElements.length - 1) ||
            (direction === 'down' && elementIndex === 0)) {
            return; // Cannot move further
        }

        const newIndex = direction === 'up' ? elementIndex + 1 : elementIndex - 1;
        const targetElement = allElements[newIndex];

        // Swap zIndex values
        const updatedElements = allElements.map(el => {
            if (el.id === id) {
                return { ...el, zIndex: targetElement.zIndex };
            } else if (el.id === targetElement.id) {
                return { ...el, zIndex: allElements[elementIndex].zIndex };
            }
            return el;
        });

        // Update state with new zIndex values
        const newTexts = updatedElements.filter(el => el.type === 'text').map(({ type, ...rest }) => rest);
        const newImages = updatedElements.filter(el => el.type === 'image').map(({ type, ...rest }) => rest);
        const newShapes = updatedElements.filter(el => el.type === 'shape').map(({ type, ...rest }) => rest);

        updateState({
            texts: newTexts,
            images: newImages,
            shapes: newShapes
        });
    };

    // Sort elements by zIndex for rendering
    const allElements = [
        ...texts.map((t) => ({ ...t, type: "text" })),
        ...images.map((i) => ({ ...i, type: "image" })),
        ...shapes.map((s) => ({ ...s, type: "shape" })),
    ].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

    const addIcon = (icon) => {
        const newText = {
            id: uuidv4(),
            text: icon,
            x: 300, // Center of the 600px wide canvas
            y: 200, // Center of the 400px tall canvas
            fontSize: 32,
            fontFamily: "Arial",
            fill: "#000000",
            rotation: 0,
            opacity: 1,
            zIndex: images.length + texts.length + shapes.length,
            type: "text"
        };
        updateState({ texts: [...texts, newText] });
        setSelectedId(newText.id);
        setSelectedType("text");
    };

    const handleCenterEventTexts = () => {
        const centeredTexts = centerEventTexts(texts);
        updateState({ texts: centeredTexts });
    };

    const [user, setUser] = useState(null);
    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            console.log(storedUser);
            setUser(JSON.parse(storedUser));
        }
    }, [])

    if (loading) {
            return (
                <>
                    <div className="loading-container">
                        <div className="spinner-border text-info" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                        <div className="loading-text">Saving your event..-</div>
                    </div>
                </>
            );
        }
    return (
        <div className="editor-container">
            {/* Left Sidebar */}
            <Sidebar
                selectedId={selectedId}
                selectedType={selectedType}
                texts={texts}
                images={images}
                shapes={shapes}
                setTexts={(newTexts) => updateState({ texts: newTexts })}
                setImages={(newImages) => updateState({ images: newImages })}
                setShapes={(newShapes) => updateState({ shapes: newShapes })}
                bgConfig={bgConfig}
                setBgConfig={(newBgConfig) => updateState({ bgConfig: newBgConfig })}
                addText={addText}
                addShape={addShape}
                addIcon={addIcon}
                handleImageUpload={handleImageUpload}
                deleteSelectedItem={deleteSelectedItem}
                downloadImage={downloadImage}
                historyActions={historyActions}
                onCenterEventTexts={handleCenterEventTexts}
            />

            {/* Canvas Area */}
            <div className="editor-main">
                {/* Navbar */}
                <div className="editor-navbar">
                    <button className="back-button" onClick={() => window.history.back()}>
                        ← Back to Templates
                    </button>
                    <div className="navbar-title">{template?.title || "Postcard"} Editor</div>
                    <div className="user-info">{user ? user.name : "Guest"}</div>
                </div>

                {/* Canvas */}
                <div className="canvas-container">
                    <Stage
                        width={600}
                        height={700}
                        ref={stageRef}
                        onClick={handleCanvasClick}
                        onTap={handleCanvasClick}
                    >
                        <Layer>
                            {bgConfig.type === "image" && bgImage ? (
                                <Image
                                    image={bgImage}
                                    width={600}
                                    height={700}
                                    // Add these properties for object-fit: center behavior
                                    offsetX={0}
                                    offsetY={0}
                                    crop={null}
                                    // This will maintain aspect ratio and center the image
                                    fillPatternImage={bgImage}
                                    fillPatternRepeat="no-repeat"
                                    fillPatternOffsetX={-(bgImage.width - 600) / 2}
                                    fillPatternOffsetY={-(bgImage.height - 700) / 2}
                                    fillPatternScaleX={600 / bgImage.width}
                                    fillPatternScaleY={700 / bgImage.height}
                                />
                            ) : (
                                <Rect width={600} height={700} fill={bgConfig.value} />
                            )}

                            {allElements.map((element) => {
                                if (element.type === "text") {
                                    return (
                                        <DraggableText
                                            key={element.id}
                                            textConfig={{ ...element, id: element.id }}
                                            isSelected={selectedId === element.id && selectedType === "text"}
                                            onSelect={() => {
                                                setSelectedId(element.id);
                                                setSelectedType("text");
                                            }}
                                            onChange={(newAttrs) =>
                                                updateState({
                                                    texts: texts.map((txt) => (txt.id === element.id ? newAttrs : txt))
                                                })
                                            }
                                        />
                                    );
                                } else if (element.type === "image") {
                                    return (
                                        <DraggableImage
                                            key={element.id}
                                            imgConfig={{ ...element, id: element.id }}
                                            isSelected={selectedId === element.id && selectedType === "image"}
                                            onSelect={() => {
                                                setSelectedId(element.id);
                                                setSelectedType("image");
                                            }}
                                            onChange={(newAttrs) =>
                                                updateState({
                                                    images: images.map((i) => (i.id === element.id ? newAttrs : i))
                                                })
                                            }
                                        />
                                    );
                                } else if (element.type === "shape") {
                                    return (
                                        <DraggableShape
                                            key={element.id}
                                            shapeConfig={{ ...element, id: element.id }}
                                            isSelected={selectedId === element.id && selectedType === "shape"}
                                            onSelect={() => {
                                                setSelectedId(element.id);
                                                setSelectedType("shape");
                                            }}
                                            onChange={(newAttrs) =>
                                                updateState({
                                                    shapes: shapes.map((s) => (s.id === element.id ? newAttrs : s))
                                                })
                                            }
                                        />
                                    );
                                }
                                return null;
                            })}
                        </Layer>
                    </Stage>
                </div>
            </div>

            {/* Right Sidebar */}
            <RightSidebar
                elements={allElements}
                selectedId={selectedId}
                setSelectedId={setSelectedId}
                setSelectedType={setSelectedType}
                updateElementZIndex={updateElementZIndex}
            />
        </div>
    );
}
