import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export function Globe() {
  const host = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = host.current
    if (!element) return
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(36, 1, .1, 100)
    camera.position.z = 5.3
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.34
    element.appendChild(renderer.domElement)

    const planet = new THREE.Group()
    const globeGeometry = new THREE.IcosahedronGeometry(1.66, 6)
    const globeMaterial = new THREE.MeshPhysicalMaterial({
      color: '#c49a35', metalness: 1, roughness: .17, clearcoat: 1, clearcoatRoughness: .12, iridescence: .26, iridescenceIOR: 1.35,
    })
    globeMaterial.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `
        #include <begin_vertex>
        float waveA = sin(position.y * 5.0 + position.x * 3.0) * .035;
        float waveB = sin(position.z * 7.0 - position.y * 4.0) * .022;
        transformed += normal * (waveA + waveB);
      `)
    }
    const globe = new THREE.Mesh(globeGeometry, globeMaterial)
    planet.add(globe)

    const halo = new THREE.Mesh(
      new THREE.RingGeometry(1.92, 2.3, 96),
      new THREE.MeshBasicMaterial({ color: '#d4af37', transparent: true, opacity: .13, side: THREE.DoubleSide }),
    )
    halo.position.z = -.38
    planet.add(halo)

    const crystalGeometry = new THREE.OctahedronGeometry(.085, 1)
    const crystalMaterial = new THREE.MeshStandardMaterial({ color: '#fff1b4', emissive: '#8b6914', emissiveIntensity: 1.7, metalness: .85, roughness: .16 })
    const crystals: Array<{ object: THREE.Mesh, phase: number }> = []
    const locations = [[-1.2, .8], [.1, 1.4], [1.25, .65], [-1.4, -.35], [-.25, -1.38], [1.25, -.85], [.65, .1]]
    locations.forEach(([x, y], index) => {
      const z = Math.sqrt(Math.max(.08, 1.66 ** 2 - x ** 2 - y ** 2))
      const crystal = new THREE.Mesh(crystalGeometry, crystalMaterial)
      crystal.position.set(x, y, z)
      crystal.rotation.set(index * .7, index * 1.1, .3)
      crystals.push({ object: crystal, phase: index * .84 })
      planet.add(crystal)
    })

    const particleGeometry = new THREE.BufferGeometry()
    const positions = new Float32Array(200 * 3)
    for (let index = 0; index < 200; index += 1) {
      const angle = index * 2.39996 + Math.random() * .3
      const radius = 2.05 + (index / 200) * 1.18 + Math.random() * .28
      positions[index * 3] = Math.cos(angle) * radius
      positions[index * 3 + 1] = (Math.random() - .5) * 4.55
      positions[index * 3 + 2] = Math.sin(angle) * .75 - .35
    }
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const particleMaterial = new THREE.PointsMaterial({ color: '#e2c77f', transparent: true, opacity: .58, size: .022, sizeAttenuation: true })
    const particles = new THREE.Points(particleGeometry, particleMaterial)
    scene.add(particles, planet)

    const key = new THREE.DirectionalLight('#ffe7a0', 5.5)
    key.position.set(3.8, 2.4, 4.2)
    const rim = new THREE.DirectionalLight('#c18c28', 3.8)
    rim.position.set(-4, .8, -1.8)
    const fill = new THREE.PointLight('#d4af37', 4.5, 8)
    fill.position.set(-1.8, -2.2, 3.5)
    scene.add(new THREE.HemisphereLight('#274c76', '#030710', 1.8), key, rim, fill)

    const pointer = { x: 0, y: 0 }
    const resize = () => {
      const size = Math.min(element.clientWidth, element.clientHeight)
      renderer.setSize(size, size, false)
      camera.aspect = 1
      camera.updateProjectionMatrix()
    }
    const move = (event: PointerEvent) => {
      const rect = element.getBoundingClientRect()
      pointer.x = ((event.clientX - rect.left) / rect.width - .5) * .36
      pointer.y = ((event.clientY - rect.top) / rect.height - .5) * .2
    }
    const leave = () => { pointer.x = 0; pointer.y = 0 }
    resize()
    window.addEventListener('resize', resize)
    element.addEventListener('pointermove', move)
    element.addEventListener('pointerleave', leave)

    let frame = 0
    const startedAt = performance.now()
    const animate = (now: number) => {
      frame = requestAnimationFrame(animate)
      const elapsed = (now - startedAt) / 1000
      const motion = reducedMotion ? 0 : elapsed
      planet.rotation.y += reducedMotion ? 0 : .0017
      planet.rotation.y += (pointer.x - planet.rotation.y * .09) * .014
      planet.rotation.x += (pointer.y + Math.sin(motion * .42) * .042 - planet.rotation.x) * .024
      const breath = 1 + Math.sin(motion * 1.05) * .018
      globe.scale.setScalar(breath)
      halo.rotation.z = motion * .055
      ;(halo.material as THREE.MeshBasicMaterial).opacity = .095 + Math.sin(motion * 1.2) * .035
      particles.rotation.y = motion * .034
      crystals.forEach(({ object, phase }) => {
        const shimmer = 1 + Math.sin(motion * 1.65 + phase) * .2
        object.scale.setScalar(shimmer)
        object.rotation.y += .012
      })
      renderer.render(scene, camera)
    }
    animate(performance.now())

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', resize)
      element.removeEventListener('pointermove', move)
      element.removeEventListener('pointerleave', leave)
      globeGeometry.dispose(); globeMaterial.dispose(); halo.geometry.dispose(); (halo.material as THREE.Material).dispose()
      crystalGeometry.dispose(); crystalMaterial.dispose(); particleGeometry.dispose(); particleMaterial.dispose(); renderer.dispose(); element.replaceChildren()
    }
  }, [])

  return <div className="globe" ref={host} aria-label="Интерактивная золотая модель экосистемы OSGARD" />
}
