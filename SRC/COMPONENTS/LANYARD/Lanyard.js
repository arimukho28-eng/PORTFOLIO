import React, { useEffect, useMemo, useRef, useState } from 'https://esm.sh/react@19.1.0';
import { Canvas, extend, useFrame } from 'https://esm.sh/@react-three/fiber@9.1.2?external=react,react-dom,three';
import { useGLTF, useTexture, Environment, Lightformer } from 'https://esm.sh/@react-three/drei@10.0.0?external=react,react-dom,three,@react-three/fiber';
import { BallCollider, CuboidCollider, Physics, RigidBody, useRopeJoint, useSphericalJoint } from 'https://esm.sh/@react-three/rapier@2.1.0?external=react,react-dom,three,@react-three/fiber';
import { MeshLineGeometry, MeshLineMaterial } from 'https://esm.sh/meshline@3.3.1?external=three';
import * as THREE from 'https://esm.sh/three@0.176.0';

extend({ MeshLineGeometry, MeshLineMaterial });

const ASSETS = '/assets/lanyard/';
const CARD = ASSETS + 'card.glb';
const FRONT = ASSETS + 'front-photo.png';
const BACK = ASSETS + 'back-photo.jpg';
const STRAP = ASSETS + 'lanyard-pattern.png';

const FRONT_UV = { x: 0, y: 0, w: 0.5, h: 0.755 };
const BACK_UV = { x: 0.5, y: 0, w: 0.5, h: 0.757 };

export default function Lanyard({
  position = [0, 0, 27],
  gravity = [0, -40, 0],
  fov = 20,
  transparent = true,
  frontImage = FRONT,
  backImage = BACK,
  lanyardImage = STRAP,
  lanyardWidth = 1.15
}) {
  const [mobile, setMobile] = useState(() => window.innerWidth < 768);

  useEffect(() => {
    const resize = () => setMobile(window.innerWidth < 768);
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  return (
    <div className="lanyard-wrapper-static">
      <Canvas
        camera={{ position, fov }}
        dpr={[1, mobile ? 1.35 : 1.8]}
        gl={{ alpha: transparent, antialias: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => gl.setClearColor(new THREE.Color(0x000000), transparent ? 0 : 1)}
      >
        <ambientLight intensity={Math.PI} />
        <Physics gravity={gravity} timeStep={mobile ? 1 / 30 : 1 / 60}>
          <Band
            mobile={mobile}
            frontImage={frontImage}
            backImage={backImage}
            lanyardImage={lanyardImage}
            lanyardWidth={lanyardWidth}
          />
        </Physics>
        <Environment blur={0.75}>
          <Lightformer intensity={2} color="white" position={[0, -1, 5]} rotation={[0, 0, Math.PI / 3]} scale={[100, 0.1, 1]} />
          <Lightformer intensity={3} color="white" position={[-1, -1, 1]} rotation={[0, 0, Math.PI / 3]} scale={[100, 0.1, 1]} />
          <Lightformer intensity={3} color="white" position={[1, 1, 1]} rotation={[0, 0, Math.PI / 3]} scale={[100, 0.1, 1]} />
          <Lightformer intensity={8} color="white" position={[-10, 0, 14]} rotation={[0, Math.PI / 2, Math.PI / 3]} scale={[100, 10, 1]} />
        </Environment>
      </Canvas>
    </div>
  );
}

function Band({ mobile, frontImage, backImage, lanyardImage, lanyardWidth }) {
  const band = useRef(), fixed = useRef(), j1 = useRef(), j2 = useRef(), j3 = useRef(), card = useRef();
  const vec = useMemo(() => new THREE.Vector3(), []);
  const ang = useMemo(() => new THREE.Vector3(), []);
  const rot = useMemo(() => new THREE.Vector3(), []);
  const dir = useMemo(() => new THREE.Vector3(), []);
  const [dragged, setDragged] = useState(false);
  const [hovered, setHovered] = useState(false);

  const segment = {
    type: 'dynamic', canSleep: true, colliders: false,
    angularDamping: 4, linearDamping: 4
  };

  const { nodes, materials } = useGLTF(CARD);
  const strap = useTexture(lanyardImage);
  const front = useTexture(frontImage);
  const back = useTexture(backImage);

  const cardMap = useMemo(() => {
    const base = materials.base.map;
    if (!base?.image || !front?.image || !back?.image) return base;

    const canvas = document.createElement('canvas');
    canvas.width = base.image.width;
    canvas.height = base.image.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(base.image, 0, 0, canvas.width, canvas.height);

    const fit = (img, r) => {
      const x = r.x * canvas.width, y = r.y * canvas.height;
      const w = r.w * canvas.width, h = r.h * canvas.height;
      const s = Math.max(w / img.width, h / img.height);
      const dw = img.width * s, dh = img.height * s;
      ctx.save();
      ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
      ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
      ctx.restore();
    };

    fit(front.image, FRONT_UV);
    fit(back.image, BACK_UV);

    const result = new THREE.CanvasTexture(canvas);
    result.colorSpace = THREE.SRGBColorSpace;
    result.flipY = base.flipY;
    result.anisotropy = 8;
    result.needsUpdate = true;
    return result;
  }, [front, back, materials.base.map]);

  const [curve] = useState(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()
  ]));

  useRopeJoint(fixed, j1, [[0,0,0],[0,0,0],1]);
  useRopeJoint(j1, j2, [[0,0,0],[0,0,0],1]);
  useRopeJoint(j2, j3, [[0,0,0],[0,0,0],1]);
  useSphericalJoint(j3, card, [[0,0,0],[0,1.5,0]]);

  useEffect(() => {
    document.body.style.cursor = hovered ? (dragged ? 'grabbing' : 'grab') : 'auto';
    return () => { document.body.style.cursor = 'auto'; };
  }, [hovered, dragged]);

  useFrame((state, delta) => {
    if (dragged) {
      vec.set(state.pointer.x, state.pointer.y, 0.5).unproject(state.camera);
      dir.copy(vec).sub(state.camera.position).normalize();
      vec.add(dir.multiplyScalar(state.camera.position.length()));
      [card,j1,j2,j3,fixed].forEach(r => r.current?.wakeUp());
      card.current?.setNextKinematicTranslation({
        x: vec.x - dragged.x, y: vec.y - dragged.y, z: vec.z - dragged.z
      });
    }

    if (!fixed.current) return;

    [j1,j2].forEach(r => {
      if (!r.current.lerped) r.current.lerped = new THREE.Vector3().copy(r.current.translation());
      const d = Math.max(0.1, Math.min(1, r.current.lerped.distanceTo(r.current.translation())));
      r.current.lerped.lerp(r.current.translation(), delta * (d * 50));
    });

    curve.points[0].copy(j3.current.translation());
    curve.points[1].copy(j2.current.lerped);
    curve.points[2].copy(j1.current.lerped);
    curve.points[3].copy(fixed.current.translation());
    band.current.geometry.setPoints(curve.getPoints(mobile ? 16 : 28));

    ang.copy(card.current.angvel());
    rot.copy(card.current.rotation());
    card.current.setAngvel({ x: ang.x, y: ang.y - rot.y * 0.25, z: ang.z });
  });

  strap.wrapS = strap.wrapT = THREE.RepeatWrapping;

  return (
    <>
      <group position={[0,4,0]}>
        <RigidBody ref={fixed} {...segment} type="fixed" />
        <RigidBody position={[0.5,0,0]} ref={j1} {...segment}><BallCollider args={[0.1]} /></RigidBody>
        <RigidBody position={[1,0,0]} ref={j2} {...segment}><BallCollider args={[0.1]} /></RigidBody>
        <RigidBody position={[1.5,0,0]} ref={j3} {...segment}><BallCollider args={[0.1]} /></RigidBody>
        <RigidBody position={[2,0,0]} ref={card} {...segment} type={dragged ? 'kinematicPosition' : 'dynamic'}>
          <CuboidCollider args={[0.8,1.125,0.01]} />
          <group
            scale={2.25} position={[0,-1.2,-0.05]}
            onPointerOver={() => setHovered(true)}
            onPointerOut={() => setHovered(false)}
            onPointerUp={e => { e.target.releasePointerCapture(e.pointerId); setDragged(false); }}
            onPointerDown={e => {
              e.target.setPointerCapture(e.pointerId);
              setDragged(new THREE.Vector3().copy(e.point).sub(vec.copy(card.current.translation())));
            }}
          >
            <mesh geometry={nodes.card.geometry}>
              <meshPhysicalMaterial
                map={cardMap} mapAnisotropy={16}
                clearcoat={mobile ? 0 : 1} clearcoatRoughness={0.15}
                roughness={0.9} metalness={0.8}
              />
            </mesh>
            <mesh geometry={nodes.clip.geometry} material={materials.metal} material-roughness={0.3} />
            <mesh geometry={nodes.clamp.geometry} material={materials.metal} />
          </group>
        </RigidBody>
      </group>
      <mesh ref={band}>
        <meshLineGeometry />
        <meshLineMaterial
          color="white" depthTest={false}
          resolution={mobile ? [900,700] : [1200,900]}
          useMap map={strap} repeat={[-4,1]} lineWidth={lanyardWidth}
        />
      </mesh>
    </>
  );
}

useGLTF.preload(CARD);
