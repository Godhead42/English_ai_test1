import { useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';

interface AudioVisualizerProps {
    isRecording: boolean;
    mediaStream: MediaStream | null;
}

const AudioSphere = ({ mediaStream, isRecording }: AudioVisualizerProps) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const materialRef = useRef<any>(null);

    const analyserRef = useRef<AnalyserNode | null>(null);
    const dataArrayRef = useRef<Uint8Array | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);

    useEffect(() => {
        if (!isRecording || !mediaStream) return;

        // Setup Audio Analyser
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = audioCtx;
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64; // Small bin for rapid smoothing

        const source = audioCtx.createMediaStreamSource(mediaStream);
        source.connect(analyser);

        analyserRef.current = analyser;
        dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);

        return () => {
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                audioContextRef.current.close().catch(() => { });
            }
        };
    }, [isRecording, mediaStream]);

    useFrame(() => {
        // If not recording, slowly return to calm state
        if (!isRecording || !analyserRef.current || !dataArrayRef.current) {
            if (meshRef.current) {
                meshRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.05);
            }
            if (materialRef.current) {
                materialRef.current.distort = THREE.MathUtils.lerp(materialRef.current.distort, 0.2, 0.05);
                materialRef.current.speed = THREE.MathUtils.lerp(materialRef.current.speed, 1, 0.05);
            }
            return;
        }

        // Get live audio data
        analyserRef.current.getByteFrequencyData(dataArrayRef.current as any);

        // Calculate average volume
        let sum = 0;
        for (let i = 0; i < dataArrayRef.current.length; i++) {
            sum += dataArrayRef.current[i];
        }
        const avg = sum / dataArrayRef.current.length;
        const normalizedAvg = avg / 255;

        // Scale and Distort based on voice volume
        const targetScale = 1.0 + (normalizedAvg * 0.9);
        const targetDistort = 0.2 + (normalizedAvg * 0.8);
        const targetSpeed = 1 + (normalizedAvg * 6);

        if (meshRef.current) {
            meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.2);
        }

        if (materialRef.current) {
            materialRef.current.distort = THREE.MathUtils.lerp(materialRef.current.distort, targetDistort, 0.2);
            materialRef.current.speed = THREE.MathUtils.lerp(materialRef.current.speed, targetSpeed, 0.2);
        }
    });

    return (
        <Sphere ref={meshRef} args={[1.2, 64, 64]}>
            <MeshDistortMaterial
                ref={materialRef}
                color="#2dd4bf"
                emissive="#0d9488"
                emissiveIntensity={0.6}
                distort={0.2}
                speed={1}
                roughness={0.1}
                metalness={0.9}
                wireframe={false}
            />
        </Sphere>
    );
};

export default function AudioVisualizer({ isRecording, mediaStream }: AudioVisualizerProps) {
    return (
        <div className="w-full h-56 md:h-72 relative rounded-2xl overflow-hidden glass-panel flex items-center justify-center">
            {/* Visual Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-brand-900/40 to-transparent pointer-events-none z-10" />

            {/* 3D Scene */}
            <Canvas camera={{ position: [0, 0, 4] }}>
                <ambientLight intensity={0.5} />
                <directionalLight position={[10, 10, 5]} intensity={1.5} />
                <pointLight position={[-10, -10, -10]} intensity={0.5} color="#5eead4" />
                <AudioSphere isRecording={isRecording} mediaStream={mediaStream} />
            </Canvas>
        </div>
    );
}
