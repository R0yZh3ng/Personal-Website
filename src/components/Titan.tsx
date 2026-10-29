import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';

/*
 * A colossal humanoid rising out of the dark behind the system, palms cupped
 * beneath the star. The mesh is a rigged mannequin; its skeleton is posed
 * procedurally (aim each bone at a target direction), then re-skinned with a
 * pearl-marble body, gold joints and a cold fresnel rim so it reads as lit by the star.
 */
const GOLD = '#ffd9a0';
const HEIGHT = 46;                                    // world units, head to heel
const HANDS_AT = new THREE.Vector3(0, -2.7, -0.4);    // midpoint between the palms
const MODEL = '/models/titan.glb';

const noHit = { raycast: () => null };

const _a = new THREE.Vector3(), _b = new THREE.Vector3();
const _q = new THREE.Quaternion(), _pq = new THREE.Quaternion(), _bq = new THREE.Quaternion();

/** Rotate `bone` (in world space) so the segment bone→child points along `dir`. */
const aim = (bone: THREE.Object3D, child: THREE.Object3D, dir: THREE.Vector3) => {
    bone.updateWorldMatrix(true, false);
    child.updateWorldMatrix(true, false);
    bone.getWorldPosition(_a);
    child.getWorldPosition(_b);
    _q.setFromUnitVectors(_b.sub(_a).normalize(), dir.clone().normalize());
    bone.getWorldQuaternion(_bq);
    bone.parent!.getWorldQuaternion(_pq).invert();
    bone.quaternion.copy(_pq.multiply(_q).multiply(_bq));
    bone.updateWorldMatrix(false, true);
};

/** Roll `bone` about a world-space axis. */
const twist = (bone: THREE.Object3D, axis: THREE.Vector3, angle: number) => {
    bone.updateWorldMatrix(true, false);
    bone.getWorldQuaternion(_bq);
    _q.setFromAxisAngle(axis.clone().normalize(), angle);
    bone.parent!.getWorldQuaternion(_pq).invert();
    bone.quaternion.copy(_pq.multiply(_q).multiply(_bq));
    bone.updateWorldMatrix(false, true);
};

const FINGERS = ['Index', 'Middle', 'Ring', 'Pinky'];

const pose = (root: THREE.Object3D) => {
    const bone = (n: string) => root.getObjectByName(`mixamorig${n}`)!;
    for (const [side, s] of [['Left', 1], ['Right', -1]] as const) {
        const arm = bone(`${side}Arm`), fore = bone(`${side}ForeArm`), hand = bone(`${side}Hand`);
        const upper = new THREE.Vector3(s * 0.15, -0.72, 0.67);
        const lower = new THREE.Vector3(-s * 0.50, -0.05, 0.86);
        aim(arm, fore, upper);
        aim(fore, hand, lower);
        // palms up: half the roll in the forearm, half in the wrist
        twist(fore, lower, Math.PI / 2);
        twist(hand, lower, Math.PI / 2);

        const cup = [0.35, 0.8, 1.2];
        for (const f of FINGERS) {
            for (let k = 1; k <= 3; k++) {
                const dir = new THREE.Vector3(-s * 0.08, Math.sin(cup[k - 1]), Math.cos(cup[k - 1]));
                aim(bone(`${side}Hand${f}${k}`), bone(`${side}Hand${f}${k + 1}`), dir);
            }
        }
        for (let k = 1; k <= 3; k++) {
            const dir = new THREE.Vector3(-s * 0.55, 0.45 + k * 0.1, 0.7);
            aim(bone(`${side}HandThumb${k}`), bone(`${side}HandThumb${k + 1}`), dir);
        }
    }
};

const bodyMaterial = () => {
    const m = new THREE.MeshPhysicalMaterial({
        color: '#d3dcea', roughness: 0.34, metalness: 0.08,
        clearcoat: 0.5, clearcoatRoughness: 0.25, sheen: 0.6, sheenColor: new THREE.Color('#8fd0ff'),
        emissive: new THREE.Color('#0a1830'), emissiveIntensity: 1,
    });
    // cold fresnel rim so the silhouette glows against the nebula
    m.onBeforeCompile = (sh) => {
        sh.fragmentShader = sh.fragmentShader.replace(
            '#include <emissivemap_fragment>',
            `#include <emissivemap_fragment>
             float rim = pow(1.0 - saturate(dot(normalize(vNormal), normalize(vViewPosition))), 2.6);
             totalEmissiveRadiance += vec3(0.30, 0.62, 1.0) * rim * 1.1;`,
        );
    };
    m.customProgramCacheKey = () => 'titan-body';
    return m;
};

const build = (source: THREE.Object3D) => {
    const root = cloneSkinned(source);
    const body = bodyMaterial();
    const gold = new THREE.MeshStandardMaterial({ color: GOLD, metalness: 1, roughness: 0.28, emissive: new THREE.Color('#3a2408') });

    // scale to HEIGHT using the skeleton (a skinned mesh's own bounds don't reflect the rig)
    root.updateWorldMatrix(true, true);
    const top = root.getObjectByName('mixamorigHeadTop_End')!.getWorldPosition(new THREE.Vector3());
    const toe = root.getObjectByName('mixamorigLeftToe_End')!.getWorldPosition(new THREE.Vector3());
    root.scale.setScalar(HEIGHT / top.distanceTo(toe));
    root.updateWorldMatrix(true, true);

    root.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) {
            const mesh = o as THREE.Mesh;
            mesh.material = o.name.includes('Joints') ? gold : body;
            mesh.frustumCulled = false; // skinned bounds don't follow the posed skeleton
            mesh.raycast = () => {};    // never block clicks on planets
        }
    });

    pose(root);

    const l = root.getObjectByName('mixamorigLeftHand')!.getWorldPosition(new THREE.Vector3());
    const r = root.getObjectByName('mixamorigRightHand')!.getWorldPosition(new THREE.Vector3());
    const offset = HANDS_AT.clone().sub(l.add(r).multiplyScalar(0.5));
    const head = root.getObjectByName('mixamorigHead')!.getWorldPosition(new THREE.Vector3()).add(offset);
    return { root, offset, head };
};

const Halo = () => {
    const outer = useRef<THREE.Group>(null);
    const crown = useRef<THREE.Mesh>(null);
    const rays = useMemo(() => {
        const pts: number[] = [];
        for (let i = 0; i < 36; i++) {
            const a = (i / 36) * Math.PI * 2;
            const r0 = 5.0, r1 = i % 3 === 0 ? 9.5 : 6.8;
            pts.push(r0 * Math.cos(a), r0 * Math.sin(a), 0, r1 * Math.cos(a), r1 * Math.sin(a), 0);
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
        return g;
    }, []);
    useFrame((_, dt) => {
        if (outer.current) outer.current.rotation.z += dt * 0.05;
        if (crown.current) { crown.current.rotation.y += dt * 0.3; crown.current.rotation.x += dt * 0.12; }
    });
    return (
        <group>
            <mesh {...noHit}>
                <torusGeometry args={[4.0, 0.05, 8, 128]} />
                <meshBasicMaterial color={GOLD} transparent opacity={0.8} blending={THREE.AdditiveBlending} depthWrite={false} />
            </mesh>
            <mesh {...noHit}>
                <torusGeometry args={[4.5, 0.02, 8, 128]} />
                <meshBasicMaterial color={GOLD} transparent opacity={0.4} blending={THREE.AdditiveBlending} depthWrite={false} />
            </mesh>
            <group ref={outer}>
                <lineSegments geometry={rays} {...noHit}>
                    <lineBasicMaterial color={GOLD} transparent opacity={0.28} blending={THREE.AdditiveBlending} depthWrite={false} />
                </lineSegments>
            </group>
            <mesh ref={crown} position={[0, 0, 1.6]} {...noHit}>
                <dodecahedronGeometry args={[3.0, 0]} />
                <meshBasicMaterial color={GOLD} wireframe transparent opacity={0.22} blending={THREE.AdditiveBlending} depthWrite={false} />
            </mesh>
        </group>
    );
};

export const Titan = () => {
    const { scene } = useGLTF(MODEL);
    const { root, offset, head } = useMemo(() => build(scene), [scene]);
    const breath = useRef<THREE.Group>(null);

    useFrame(({ clock }) => {
        // slow breathing, pivoting at the palms so the cup never drifts off the star
        if (breath.current) breath.current.scale.y = 1 + Math.sin(clock.elapsedTime * 0.5) * 0.004;
    });

    return (
        <>
            <hemisphereLight args={['#6d8fd6', '#1a0e24', 0.55]} />
            <directionalLight position={[-6, 14, -30]} intensity={2.2} color="#9cc8ff" />
            <group ref={breath} position={HANDS_AT}>
                <group position={offset.clone().sub(HANDS_AT)}>
                    <primitive object={root} />
                </group>
            </group>
            <group position={[head.x, head.y + 0.4, head.z - 1.8]} scale={1.15}>
                <Halo />
            </group>
        </>
    );
};

useGLTF.preload(MODEL);
