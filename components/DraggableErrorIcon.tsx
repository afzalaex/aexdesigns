"use client";

import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";

type Position = {
  x: number;
  y: number;
};

type Bounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type DragState = {
  shapeId: string;
  pointerId: number;
  originX: number;
  originY: number;
  startSvgX: number;
  startSvgY: number;
};

const ICON_WIDTH = 480;
const ICON_HEIGHT = 240;
const STAGE_WIDTH = 720;
const STAGE_HEIGHT = 420;
const BASE_OFFSET_X = (STAGE_WIDTH - ICON_WIDTH) / 2;
const BASE_OFFSET_Y = (STAGE_HEIGHT - ICON_HEIGHT) / 2;
const KEYBOARD_STEP = 24;
const SHAPE_IDS = [
  "cross-top",
  "cross-right",
  "triangle-left",
  "cross-bottom",
  "triangle-top-right",
  "triangle-bottom-right",
] as const;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function DraggableErrorIcon() {
  const svgRef = useRef<SVGSVGElement>(null);
  const groupRefs = useRef<Record<string, SVGGElement | null>>({});
  const boundsRef = useRef<Record<string, Bounds>>({});
  const dragStateRef = useRef<DragState | null>(null);
  const [positions, setPositions] = useState<Record<string, Position>>(() =>
    Object.fromEntries(
      SHAPE_IDS.map((shapeId) => [shapeId, { x: 0, y: 0 }])
    ) as Record<string, Position>
  );
  const [activeShapeId, setActiveShapeId] = useState<string | null>(null);

  function clampPosition(shapeId: string, nextPosition: Position): Position {
    const bounds = boundsRef.current[shapeId];
    if (!bounds) {
      return nextPosition;
    }

    return {
      x: clamp(
        nextPosition.x,
        -(BASE_OFFSET_X + bounds.x),
        STAGE_WIDTH - (BASE_OFFSET_X + bounds.x + bounds.width)
      ),
      y: clamp(
        nextPosition.y,
        -(BASE_OFFSET_Y + bounds.y),
        STAGE_HEIGHT - (BASE_OFFSET_Y + bounds.y + bounds.height)
      ),
    };
  }

  function setShapePosition(shapeId: string, nextPosition: Position): void {
    setPositions((currentPositions) => ({
      ...currentPositions,
      [shapeId]: clampPosition(shapeId, nextPosition),
    }));
  }

  function moveShapeBy(shapeId: string, deltaX: number, deltaY: number): void {
    const currentPosition = positions[shapeId] ?? { x: 0, y: 0 };

    setShapePosition(shapeId, {
      x: currentPosition.x + deltaX,
      y: currentPosition.y + deltaY,
    });
  }

  function clientPointToSvg(clientX: number, clientY: number): Position | null {
    const svg = svgRef.current;
    if (!svg) {
      return null;
    }

    const rect = svg.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return null;
    }

    return {
      x: ((clientX - rect.left) / rect.width) * STAGE_WIDTH,
      y: ((clientY - rect.top) / rect.height) * STAGE_HEIGHT,
    };
  }

  function finishDrag(pointerId: number, target: SVGGElement): void {
    if (target.hasPointerCapture(pointerId)) {
      target.releasePointerCapture(pointerId);
    }

    dragStateRef.current = null;
    setActiveShapeId(null);
  }

  function handlePointerDown(
    event: PointerEvent<SVGGElement>,
    shapeId: string
  ): void {
    event.preventDefault();
    const svgPoint = clientPointToSvg(event.clientX, event.clientY);
    if (!svgPoint) {
      return;
    }

    const currentPosition = positions[shapeId] ?? { x: 0, y: 0 };

    dragStateRef.current = {
      shapeId,
      pointerId: event.pointerId,
      originX: currentPosition.x,
      originY: currentPosition.y,
      startSvgX: svgPoint.x,
      startSvgY: svgPoint.y,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
    setActiveShapeId(shapeId);
  }

  function handlePointerMove(event: PointerEvent<SVGGElement>): void {
    const dragState = dragStateRef.current;

    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    const svgPoint = clientPointToSvg(event.clientX, event.clientY);
    if (!svgPoint) {
      return;
    }

    setShapePosition(dragState.shapeId, {
      x: dragState.originX + (svgPoint.x - dragState.startSvgX),
      y: dragState.originY + (svgPoint.y - dragState.startSvgY),
    });
  }

  function handlePointerUp(event: PointerEvent<SVGGElement>): void {
    if (dragStateRef.current?.pointerId !== event.pointerId) {
      return;
    }

    finishDrag(event.pointerId, event.currentTarget);
  }

  function handlePointerCancel(event: PointerEvent<SVGGElement>): void {
    if (dragStateRef.current?.pointerId !== event.pointerId) {
      return;
    }

    finishDrag(event.pointerId, event.currentTarget);
  }

  function handleKeyDown(event: KeyboardEvent<SVGGElement>, shapeId: string): void {
    switch (event.key) {
      case "ArrowUp":
        event.preventDefault();
        moveShapeBy(shapeId, 0, -KEYBOARD_STEP);
        break;
      case "ArrowRight":
        event.preventDefault();
        moveShapeBy(shapeId, KEYBOARD_STEP, 0);
        break;
      case "ArrowDown":
        event.preventDefault();
        moveShapeBy(shapeId, 0, KEYBOARD_STEP);
        break;
      case "ArrowLeft":
        event.preventDefault();
        moveShapeBy(shapeId, -KEYBOARD_STEP, 0);
        break;
      case "Home":
        event.preventDefault();
        setShapePosition(shapeId, { x: 0, y: 0 });
        break;
      default:
        break;
    }
  }

  useEffect(() => {
    const nextBounds: Record<string, Bounds> = {};

    for (const shapeId of SHAPE_IDS) {
      const group = groupRefs.current[shapeId];
      if (!group) {
        continue;
      }

      const bounds = group.getBBox();
      nextBounds[shapeId] = {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
      };
    }

    boundsRef.current = nextBounds;
    setPositions((currentPositions) => {
      const nextPositions = { ...currentPositions };

      for (const shapeId of SHAPE_IDS) {
        nextPositions[shapeId] = clampPosition(
          shapeId,
          currentPositions[shapeId] ?? { x: 0, y: 0 }
        );
      }

      return nextPositions;
    });
  }, []);

  function renderShape(shapeId: string) {
    switch (shapeId) {
      case "cross-top":
        return (
          <rect
            className="error-piece__shape"
            x="225.6"
            y="-16.9"
            width="25.9"
            height="129.4"
            transform="matrix(9.779181e-02 -0.9952 0.9952 9.779181e-02 167.6371 280.5772)"
          />
        );
      case "cross-right":
        return (
          <rect
            className="error-piece__shape"
            x="173.7"
            y="94.4"
            width="129.4"
            height="25.9"
            transform="matrix(0.9959 -9.087470e-02 9.087470e-02 0.9959 -8.7671 22.1063)"
          />
        );
      case "triangle-left":
        return (
          <polygon
            className="error-piece__shape"
            points="153,149.3 30.5,191.2 49.8,47.8"
          />
        );
      case "cross-bottom":
        return (
          <rect
            className="error-piece__shape"
            x="225.6"
            y="110.4"
            width="25.9"
            height="129.4"
            transform="matrix(0.1072 -0.9942 0.9942 0.1072 38.9166 393.5083)"
          />
        );
      case "triangle-top-right":
        return (
          <polygon
            className="error-piece__shape"
            points="448.2,34.8 426.5,64.3 404.9,93.8 394.1,108.6 379.3,97.8 349.8,76.1 320.2,54.4"
          />
        );
      case "triangle-bottom-right":
        return (
          <polygon
            className="error-piece__shape"
            points="449.5,139.6 341.8,211.4 359.9,121.6"
          />
        );
      default:
        return null;
    }
  }

  return (
    <div className="error-media">
      <svg
        ref={svgRef}
        className="error-media__canvas"
        viewBox={`0 0 ${STAGE_WIDTH} ${STAGE_HEIGHT}`}
        aria-label="Draggable 404 icon pieces"
      >
        <g transform={`translate(${BASE_OFFSET_X} ${BASE_OFFSET_Y})`}>
          {SHAPE_IDS.map((shapeId, index) => {
            const position = positions[shapeId] ?? { x: 0, y: 0 };
            const isDragging = activeShapeId === shapeId;

            return (
              <g
                key={shapeId}
                ref={(node) => {
                  groupRefs.current[shapeId] = node;
                }}
                className={`error-piece${isDragging ? " is-dragging" : ""}`}
                transform={`translate(${position.x} ${position.y})`}
                role="button"
                tabIndex={0}
                aria-label={`Drag icon piece ${index + 1}`}
                onPointerDown={(event) => handlePointerDown(event, shapeId)}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerCancel}
                onKeyDown={(event) => handleKeyDown(event, shapeId)}
              >
                {renderShape(shapeId)}
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
