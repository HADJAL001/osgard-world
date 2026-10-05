import { useEffect, useRef } from 'react'
import * as THREE from 'three'

const SIGNAL_COUNT = 7

export function LivingGlobe() {
  const host = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const element = host.current
    if (!element) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const mobile = window.matchMedia('(max-width: 760px)').matches
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(34, 1, .1, 100)
    camera.position.z = 5.7
    const renderer = new THREE.WebGLRenderer({ antialias: !mobile, alpha: true, powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.25 : 1.75))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.2
    element.appendChild(renderer.domElement)

    const planet = new THREE.Group()
    const starCount = mobile ? 420 : 1100
    const starPositions = new Float32Array(starCount * 3)
    const starColors = new Float32Array(starCount * 3)
    const starGold = new THREE.Color('#d4af37')
    const starPlatinum = new THREE.Color('#d7dbe0')
    for (let index = 0; index < starCount; index += 1) {
      const radius = 1.65 + Math.random() * 1.35
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos((Math.random() * 2) - 1)
      const offset = index * 3
      starPositions[offset] = radius * Math.sin(phi) * Math.cos(theta)
      starPositions[offset + 1] = radius * Math.cos(phi)
      starPositions[offset + 2] = radius * Math.sin(phi) * Math.sin(theta)
      const color = index % 9 === 0 ? starGold : starPlatinum
      starColors[offset] = color.r; starColors[offset + 1] = color.g; starColors[offset + 2] = color.b
    }
    const starGeometry = new THREE.BufferGeometry()
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3))
    starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3))
    const starMaterial = new THREE.PointsMaterial({ size: mobile ? .022 : .028, vertexColors: true, transparent: true, opacity: .58, depthWrite: false, blending: THREE.AdditiveBlending })
    const stars = new THREE.Points(starGeometry, starMaterial)
    scene.add(stars)
    const coreGeometry = new THREE.SphereGeometry(1.34, 64, 64)
    const coreMaterial = new THREE.MeshBasicMaterial({ color: '#0a1428' })
    planet.add(new THREE.Mesh(coreGeometry, coreMaterial))
    const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(1.42, 2), new THREE.MeshBasicMaterial({ color: '#d4af37', wireframe: true, transparent: true, opacity: .18 }))
    planet.add(mesh)
    const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(1.62, 48, 48), new THREE.MeshBasicMaterial({ color: '#d4af37', transparent: true, opacity: .13, side: THREE.BackSide }))
    planet.add(atmosphere)
    const orbit = new THREE.Mesh(new THREE.TorusGeometry(2.2, .008, 10, 120), new THREE.MeshBasicMaterial({ color: '#d4af37', transparent: true, opacity: .42 }))
    orbit.rotation.set(Math.PI / 6, -.18, 0)
    scene.add(orbit)

    const signalGroup = new THREE.Group()
    signalGroup.rotation.copy(orbit.rotation)
    const signalGeometry = new THREE.SphereGeometry(.07, 16, 16)
    const signalMaterial = new THREE.MeshBasicMaterial({ color: '#d4af37' })
    const signals: Array<{ object: THREE.Mesh, phase: number }> = []
    for (let index = 0; index < SIGNAL_COUNT; index += 1) {
      const angle = (Math.PI * 2 * index) / SIGNAL_COUNT - .55
      const signal = new THREE.Mesh(signalGeometry, signalMaterial)
      signal.position.set(Math.cos(angle) * 2.2, Math.sin(angle) * 2.2, 0)
      const light = new THREE.PointLight('#d4af37', 1.4, .8)
      signal.add(light)
      signalGroup.add(signal)
      signals.push({ object: signal, phase: index * .78 })
    }
    scene.add(signalGroup)

    scene.add(planet)

    const key = new THREE.DirectionalLight('#d4af37', 3.2); key.position.set(3.4, 2.5, 4)
    const rim = new THREE.DirectionalLight('#d4af37', 2.8); rim.position.set(-3.6, .3, -1.5)
    const fill = new THREE.PointLight('#0a1428', .2, 7); fill.position.set(-1.6, -2.2, 2.3)
    scene.add(new THREE.HemisphereLight('#17345e', '#01040a', 1.25), key, rim, fill)

    const pointer = { x: 0, y: 0 }
    const resize = () => { const size = Math.min(element.clientWidth, element.clientHeight); renderer.setSize(size, size, false); camera.aspect = 1; camera.updateProjectionMatrix() }
    const move = (event: PointerEvent) => { const rect = element.getBoundingClientRect(); pointer.x = ((event.clientX - rect.left) / rect.width - .5) * .34; pointer.y = ((event.clientY - rect.top) / rect.height - .5) * .2 }
    const leave = () => { pointer.x = 0; pointer.y = 0 }
    resize(); window.addEventListener('resize', resize); element.addEventListener('pointermove', move); element.addEventListener('pointerleave', leave)
    let frame = 0
    const startedAt = performance.now()
    const animate = (now: number) => {
      frame = requestAnimationFrame(animate)
      const elapsed = reduced ? 0 : (now - startedAt) / 1000
      planet.rotation.y += reduced ? 0 : .00135
      planet.rotation.y += (pointer.x - planet.rotation.y * .1) * .012
      planet.rotation.x += (pointer.y - planet.rotation.x) * .018
      stars.rotation.y = elapsed * .018 + pointer.x * .35
      stars.rotation.x = pointer.y * .22
      starMaterial.opacity = .48 + Math.sin(elapsed * .8) * .08
      orbit.rotation.z = elapsed * .06; signalGroup.rotation.z = elapsed * .06
      ;(atmosphere.material as THREE.MeshBasicMaterial).opacity = .12 + Math.sin(elapsed * 1.1) * .04
      signals.forEach(({ object, phase }) => object.scale.setScalar(1 + Math.sin(elapsed * 1.55 + phase) * .24))
      renderer.render(scene, camera)
    }
    animate(performance.now())
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', resize); element.removeEventListener('pointermove', move); element.removeEventListener('pointerleave', leave); coreGeometry.dispose(); coreMaterial.dispose(); mesh.geometry.dispose(); (mesh.material as THREE.Material).dispose(); atmosphere.geometry.dispose(); (atmosphere.material as THREE.Material).dispose(); orbit.geometry.dispose(); (orbit.material as THREE.Material).dispose(); signalGeometry.dispose(); signalMaterial.dispose(); starGeometry.dispose(); starMaterial.dispose(); renderer.dispose(); element.replaceChildren() }
  }, [])
  return <div className="globe" ref={host} aria-label="Interactive OSGARD ecosystem model" />
}
