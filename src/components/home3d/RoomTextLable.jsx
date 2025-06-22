import { Text } from "@react-three/drei";
import React, { useRef } from "react";

function RoomTextLabel({
  position,
  rotation,
  scale,
  label,
  value,
  intensity = 5,
  color = "#00ff00",
}) {
  const textRef = useRef();

  return (
    <Text
      position={position}
      rotation={rotation}
      scale={scale}
      fontSize={0.3}
      anchorX="center"
      anchorY="middle"
      ref={textRef}
      material-toneMapped={false} // SUPER IMPORTANT for bloom to work
    >
      {`${label}: ${value}`}
      <meshBasicMaterial attach="material" color={color} toneMapped={false} />
    </Text>
  );
}

export default RoomTextLabel;
