import * as THREE from "./three"
import { GLTFLoader } from "./three/addons/loaders/GLTFLoader.js"
import { DRACOLoader } from './three/addons/loaders/DRACOLoader.js'
import { FontLoader } from './three/addons/loaders/FontLoader.js'
import { TextGeometry } from './three/addons/geometries/TextGeometry.js'
import { OrbitControls } from "./three/addons/controls/OrbitControls.js"
import { CSS3DRenderer, CSS3DObject } from "./three/addons/renderers/CSS3DRenderer.js"
import { lights } from "./three/tsl"
import Stats from './three/addons/libs/stats.module.js'

const { sin, cos, atan2, max, abs, PI, random } = Math

const YOUTUBE_LINK = 'https://www.youtube.com/watch?v=C1T3uYeSYBQ'
const DRACO_DECODER_PATH = 'https://threejs.org/examples/jsm/libs/draco/'
const asset = (name) => `https://assets.codepen.io/25387/${name}`

let stats, frustum, cameraViewProjectionMatrix, raycaster, mouse,
    textureLoader, gltfLoader, dracoLoader,
    scene, camera, renderer, controls, cssRenderer, cssScene,
    light, sky, saturn, cars, text

const state = {
  freeCamera: 0,
  wasHula: 0,
  hula: 0,
  frame: 0,
  lastTap: 0
}

const inspection = {
  fps: 0,
  loadingTimes: 0,
  labels: 0
}

const cameraFinalPosition = {
  x: 0,
  y: 500,
  z: 850
}

const entrySpeed = {
  x: .4,
  y: 1,
  z: .6
}

const center = {
  x: 32,
  y: 26.5,
  z: 0,
}

const minPan = new THREE.Vector3(-150, -75, -150)
const maxPan = new THREE.Vector3(150, 75, 150)

const outerLane = 67
const innerLane = 56
const outerSpeed = .0025
const innerSpeed =  .0035
const carScale = .975

const carsConfig = {
  outer: [{
    model: '1965_pontiac_gto.glb',
    modelScale: .08,
    modelAxisFix: PI * .2,
    spotLightIntensity: 10,
    orbitProgress: .3
  }, {
    model: '1970_chrysler_300.glb',
    modelScale: .0075,
    modelAltitudeFix: .5,
    spotLightIntensity: 5,
    orbitProgress: .55
  }, {
    model: '1962_pontiac_catalina.glb',
    modelScale: 1.8,
    modelAxisFix: PI / -2,
    orbitProgress: .7
  }, {
    model: '80s_american_wagon.glb',
    modelScale: .05,
    modelAxisFix: PI / 2,
    spotLightIntensity: 30,
    orbitProgress: .83
  }, {
    model: '1971_pontiac_lemans.glb',
    modelScale: .2,
    spotLightIntensity: 5,
    orbitProgress: .9
  }],

  inner: [{
    model: '1971_datsun_510.glb',
    modelScale: .057,
    modelAxisFix: PI / -2,
    orbitProgress: -.1
  }, {
    model: '1971_chrysler_newyorker.glb',
    modelAxisFix: PI / -2,
    modelScale: 7.7,
    orbitProgress: -.02
  }, {
    model: '1961_chevrolet_impala.glb',
    modelScale: .018,
    modelAxisFix: PI,
    modelAltitudeFix: 1.5,
    spotLightIntensity: 5,
    orbitProgress: .06
  }, {
    model: '1966_pontiac_bonneville.glb',
    modelScale: .0077,
    modelAltitudeFix: 1,
    spotLightIntensity: 25,
    orbitProgress: .14
  }, {
    model: '1968_chevrolet_impala.glb',
    modelScale: .0085,
    modelAxisFix: PI,
    modelAltitudeFix: .25,
    spotLightIntensity: 1,
    orbitProgress: .35
  }, {
    model: '1960_chrysler_saragota.glb',
    modelScale: .018,
    modelAxisFix: PI,
    spotLightIntensity: 10,
    orbitProgress: .5
  }, {
    model: '1969_dodge_coronet.glb',
    modelScale: .125,
    modelAxisFix: PI,
    orbitProgress: .675,
  }]
}

function ease(t, total = 2200) {
  const prog = t / total
  return total - (sin(prog / (PI / 6)) * total)
}

function HTMLToDOM(html) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  return doc.body.firstElementChild
}

function log(title, content) {
  const duration = 10
  const fadeDuration = 1
  const log = HTMLToDOM(`
    <div class="log" style="
      --duration: ${duration}s";
      --fade-duration: ${fadeDuration}s;
    >
      <em>${title}</em>${content}
    </div>
  `)
  document.body.appendChild(log)
  setTimeout(() => {
    log.remove()
  }, (duration + fadeDuration) * 1000)
}

function inspectLoadingTimes() {
  const start = Date.now()
  console.log('start')
  const models = cars.map(c => c.model)
  models.forEach((m, i) => {
    m.then(() => log(
      Date.now() - start, cars[i].modelName
    ))
    m.catch(e => log(m, e))
  })
  Promise.all(models).then(() => {
    log(Date.now() - start, 'all')
  })
}

function toggleHula() {
  state.hula = !state.hula
  if (!state.hula) {
    state.wasHula = state.frame
  }
}

function openYoutube() {
  window.open(YOUTUBE_LINK, '_blank')
}

function addText() {
  const loader = new FontLoader()
  const group = new THREE.Group()
  loader.load(asset('Nulshock_Bold-2.json'), font => {
    const fontSettings = {
      font: font,
      size: 3.7,
      depth: 2,
      curveSegments: 10,
      bevelEnabled: false
    }

    const materials = [
      new THREE.MeshPhongMaterial({
        color: 0xcdb573,
        flatShading: true
      }),
      new THREE.MeshPhongMaterial({
        color: 0xd5c384
      })
    ]

    const intelligent = new TextGeometry('intelligent', fontSettings)
    const drumAndBass = new TextGeometry('drum and bass', fontSettings)
    const vol2 = new TextGeometry('vol. 2', fontSettings)

    const mesh1 = new THREE.Mesh(intelligent, materials)
    const mesh2 = new THREE.Mesh(drumAndBass, materials)
    const mesh3 = new THREE.Mesh(vol2, materials)
    mesh2.position.y = -5.25
    mesh3.position.y = -10.5

    group.add(mesh1)
    group.add(mesh2)
    group.add(mesh3)
    group.position.x = center.x - 56.9
    group.position.y = center.y - 10.8 // 40.8
    group.position.z = center.z + 80 // 160
    group.rotation.y = PI * 2
    group.rotation.x = PI / -5.33
    
    scene.add(group)
  })

  return group
}

function addLight() {
  const light = new THREE.DirectionalLight('#FFF6D6', 4)
  light.position.set(-230, 185, 120)
  light.target.position.set(
    center.x,
    center.y,
    center.z
  )
  light.castShadow = true
  light.shadow.mapSize.width = 1600
  light.shadow.mapSize.height = 1600
  light.shadow.bias = -0.0027
  light.shadow.camera.near = 1
  light.shadow.camera.far = 1000
  light.shadow.camera.top = 100
  light.shadow.camera.bottom = -100
  light.shadow.camera.left = -100
  light.shadow.camera.right = 100
  light.shadow.radius = .5
  light.shadow.blurSamples = 5
  scene.add(light)
  return light
}

function addSky() {
  const geometry = new THREE.SphereGeometry(450, 72, 72)
  const textureUri = asset('cosmic-caterpillar-2.webp')
  const texture = textureLoader.load(textureUri)
  texture.colorSpace = THREE.SRGBColorSpace 
  texture.wrapT = THREE.RepeatWrapping
  texture.wrapS = THREE.RepeatWrapping
  texture.repeat = new THREE.Vector2(-11, 11)
  texture.offset.x = .5325
  texture.offset.y = 1.045
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.BackSide
  })
  const sphere = new THREE.Mesh(geometry, material)
  sphere.position.x = center.x
  sphere.position.y = center.y
  sphere.position.z = center.z
  sphere.rotation.z = -3.5 * PI / 180
  scene.add(sphere)
  return sphere
}

function addSaturn() {
  const tilt = -9 * PI / 180
  const bodyScaleX = 1.02
  const bodyScaleY = 0.95
  const bodyRotationOrbit = 0.001
  const bodyRotationHula = 0.06

  let bodyScale = bodyScaleX
  let bodyRotation = bodyRotationOrbit

  let hoopState = 0
  let hoopDistance = 18

  const body = (() => {
    const geometry = new THREE.SphereGeometry(30, 64, 64)
    const texture = textureLoader.load(
      asset('saturn-surface-28.webp')
    )
    texture.colorSpace = THREE.SRGBColorSpace 
    const material = new THREE.MeshStandardMaterial({
      map: texture
    })
    texture.offset.y = -.15
    const sphere = new THREE.Mesh(geometry, material)
    sphere.castShadow = true
    sphere.receiveShadow = true
    sphere.position.x = center.x
    sphere.position.y = center.y
    sphere.position.z = center.z
    sphere.scale.set(
      bodyScaleX,
      bodyScaleY,
      bodyScaleX
    )
    return sphere
  })()

  const ring = (() => {
    const texture = textureLoader.load(
      asset('saturn-rings-24.webp')
    )
    texture.wrapT = THREE.RepeatWrapping
    texture.colorSpace = THREE.SRGBColorSpace 

    const geometry = new THREE.RingGeometry(49.2, 73, 128)
    var pos = geometry.attributes.position
    var v3 = new THREE.Vector3()
    for (let i = 0; i < pos.count; i++) {
      v3.fromBufferAttribute(pos, i)
      let u = atan2(v3.x, v3.y)
      let v = v3.length() * .0267//.041
      geometry.attributes.uv.setXY(i, u, v)
    }

    const material = new THREE.MeshStandardNodeMaterial({
      map: texture,
      side: THREE.DoubleSide,
      transparent: true
    })

    const ring = new THREE.Mesh(geometry, material)
    ring.material.lightsNode = lights([ light ])

    ring.position.x = center.x
    ring.position.y = center.y
    ring.position.z = center.z
    ring.rotation.x = PI / 2
    ring.receiveShadow = true
    ring.castShadow = true
    return ring
  })()

  const chill = () => {
    body.rotation.y -= bodyRotation
  }

  const hoop = () => {
    body.rotation.y -= bodyRotation
    ring.position.x = center.x + cos(hoopState) * hoopDistance
    ring.position.z = center.z + cos(hoopState - PI / 2) * hoopDistance
    body.scale.set(
      bodyScale - .01,
      bodyScaleY,
      bodyScaleX
    )
    hoopState += 0.1
    hoopDistance = 18
    bodyRotation += (bodyRotationHula - bodyRotation) / 50
    bodyScale += (bodyScaleY - bodyScale) / 50
  }

  const stopHoop = () => {
    body.scale.set(
      bodyScale,
      bodyScaleY,
      bodyScaleX
    )
    body.rotation.y -= bodyRotation
    ring.position.x = center.x + cos(hoopState) * hoopDistance
    ring.position.z = center.z + cos(hoopState - PI / 2) * hoopDistance
    hoopState += 0.1
    hoopDistance = max(0, hoopDistance * .98)
    bodyRotation -= (bodyRotation - bodyRotationOrbit) / 100
    bodyScale -= (bodyScale - bodyScaleX) / 100
  }

  const whole = new THREE.Group()
  whole.add(body)
  whole.add(ring)
  whole.rotation.z = tilt
  scene.add(whole)

  return {
    body,
    ring,
    whole,
    chill,
    hoop,
    stopHoop
  }
}

function addCar ({
  model,
  modelAxisFix = 0,
  modelAltitudeFix = 0,
  modelScale = 1,
  spotLightColor = '#FFEE99',
  spotLightIntensity = 15,
  orbitSpeed = .005,
  orbitSize,
  orbitCenter,
  orbitProgress,
  scene = scene
}) {
  const car = new Promise((resolve, reject) => {
    gltfLoader.load(asset(model), (object) => {
      object.scene.traverse(node => {
        if (node.isMesh) {
          node.castShadow = true
          node.receiveShadow = true
        }
      })
      object.scene.scale.set(
        modelScale,
        modelScale,
        modelScale
      )
      scene.add(object.scene)
      resolve(object.scene)
    })
  })

  const spotLight = new THREE.SpotLight(spotLightColor, spotLightIntensity)
  spotLight.castShadow = false
  spotLight.angle = PI / 5
  spotLight.penumbra = 1
  spotLight.decay = 0
  car.then(carModel => spotLight.target = carModel)
  scene.add(spotLight)

  let modelLabel
  if (inspection.labels) {
    const div = document.createElement('div')
    div.innerHTML = `
      ${readableModelName()}
      <span>(${orbitProgress})</span>
    `
    div.classList.add('css-scene__car-label')
    modelLabel = new CSS3DObject(div)
    cssScene.add(modelLabel)
  }

  let progress = PI * 2 * orbitProgress
  let randomizedOrbitSize = orbitSize + random() - .5

  function readableModelName() {
    return model
      .split('_')
      .map(word =>
        word[0].toUpperCase() + word.slice(1)
      )
      .join(' ')
      .replace(/\.glb$/, '')
  }

  const updateSpotLight = (carModel) => {
    spotLight.position.set(
      carModel.position.x + 5 * cos(progress),
      carModel.position.y + 10,
      carModel.position.z - 5 * sin(progress)
    )
  }

  const updateModelLabel = (carModel) => {
    if (inspection.labels) {
      modelLabel.position.set(
        carModel.position.x,
        carModel.position.y + 5,
        carModel.position.z
      )
    }
  }

  const drive = () => {
    return car.then(carModel => {
      carModel.position.x = orbitCenter.x + sin(progress) * randomizedOrbitSize
      carModel.position.y = orbitCenter.y + modelAltitudeFix
      carModel.position.z = orbitCenter.z + cos(progress) * randomizedOrbitSize
      carModel.rotation.y = progress + PI / 2 + modelAxisFix
      updateSpotLight(carModel)
      updateModelLabel(carModel)
      progress += orbitSpeed
      return carModel
    })
  }

  const flyAway = () => {
    spotLight.intensity = 0
    car.then(carModel => {
      const xTarget = orbitCenter.x + sin(progress) * 500
      const xDiff = xTarget - carModel.position.x
      carModel.position.x += (xDiff / 1000)

      carModel.position.y += ((700 - carModel.position.y) / 1000)

      const zTarget = orbitCenter.z + cos(progress) * 500
      const zDiff = zTarget - carModel.position.z
      carModel.position.z += (zDiff / 1000)

      carModel.rotation.x += .033
      carModel.rotation.y += .033

      updateSpotLight(carModel)
      updateModelLabel(carModel)
    })
  }

  const flyIn = (t) => {
    car.then(carModel => {
      const xRotTarget = 0
      const xRotDiff = carModel.rotation.x - xRotTarget
      const yRotTarget = progress + PI / 2 + modelAxisFix
      const yRotDiff = carModel.rotation.y - yRotTarget
      const zRotTarget = 0
      const zRotDiff = carModel.rotation.z - zRotTarget
      if (t < 275) {
        carModel.rotation.x -= .025
        carModel.rotation.y -= .033
        carModel.rotation.z -= .016
      } else {
        carModel.rotation.x -= (xRotDiff / 20)
        carModel.rotation.y -= (yRotDiff / 15)
        carModel.rotation.z -= (zRotDiff / 20)
      }

      const xTarget = orbitCenter.x + sin(progress) * randomizedOrbitSize
      const yTarget = orbitCenter.y + modelAltitudeFix
      const zTarget = orbitCenter.z + cos(progress) * randomizedOrbitSize
      const xDiff = carModel.position.x - xTarget
      const yDiff = carModel.position.y - yTarget
      const zDiff = carModel.position.z - zTarget
      if (xDiff < .2 && yDiff < .2 && zDiff < .2) {
        return drive()
      }

      carModel.position.x -= (xDiff / ease(t, 500))
      carModel.position.y -= (yDiff / ease(t, 500))
      carModel.position.z -= (zDiff / ease(t, 500))

      const lightTarget = spotLightIntensity
      const lightDiff = spotLightIntensity - spotLight.intensity
      spotLight.intensity += (lightDiff / 50)

      updateSpotLight(carModel)
      updateModelLabel(carModel)
    })
  }

  const resetProgress = () => {
    progress = PI * 2 * orbitProgress
  }

  return {
    modelName: model,
    model: car,
    spotLight,
    drive,
    flyAway,
    flyIn,
    resetProgress
  }
}

const addOrbitCar = (params) => addCar({
  ...params,
  orbitCenter: params.orbitCenter || center,
  modelScale: params.modelScale * carScale,
  scene: saturn.whole
})

const addOuterCar = (params) => addOrbitCar({
  ...params,
  orbitSize: params.orbitSize || outerLane,
  orbitSpeed: params.orbitSpeed || outerSpeed
})

const addInnerCar = (params) => addOrbitCar({
  ...params,
  orbitSize: params.orbitSize || innerLane,
  orbitSpeed: params.orbitSpeed || innerSpeed * -1
})

function updateFrustum() {
  camera.updateMatrixWorld()
  cameraViewProjectionMatrix.multiplyMatrices(
    camera.projectionMatrix,
    camera.matrixWorldInverse
  )
  frustum.setFromProjectionMatrix(
    cameraViewProjectionMatrix
  )
}

function cullObjects(scene) {
  scene.traverse((object) => {
    if (object.isMesh) {
      const boundingBox = new THREE.Box3().setFromObject(object)
      object.visible = frustum.intersectsBox(boundingBox)
    }
  })
}

function animate() {
  const { freeCamera, hula, wasHula, frame } = state

  controls.update()
  controls.target.clamp(minPan, maxPan)

  if (hula) {
    cars.forEach(car => car.flyAway())
    saturn.hoop()
  } else if (wasHula) {
    cars.forEach(car => car.flyIn(frame - wasHula))
    saturn.stopHoop()
  } else {
    cars.forEach(car => car.drive())
    saturn.chill()
  }

  renderer.render(scene, camera)

  if (inspection.labels) {
    cssRenderer.render(cssScene, camera)
  }

  if (!freeCamera) {
    const cameraDiff = {
      x: camera.position.x - cameraFinalPosition.x,
      y: camera.position.y - cameraFinalPosition.y,
      z: camera.position.z - cameraFinalPosition.z
    }
    if (abs(cameraDiff.x) > .01) {
      camera.position.x -= (cameraDiff.x / (entrySpeed.x * ease(frame)))
    }
    if (abs(cameraDiff.y) > .01) {
      camera.position.y -= (cameraDiff.y / (entrySpeed.y * ease(frame)))
    }
    if (abs(cameraDiff.z) > .01) {
      camera.position.z -= (cameraDiff.z / (entrySpeed.z * ease(frame)))
    }
  }

  if (inspection.fps) {
    stats.update()
  }

  updateFrustum()
  cullObjects(scene)
  state.frame++
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
  if (inspection.labels) {
    cssRenderer.setSize(window.innerWidth, window.innerHeight)
  }
}

function onCanvasDoubleClick(e) {
  e.preventDefault()
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1
  raycaster.setFromCamera(mouse, camera)
  const [ intersectsSaturn ] = raycaster.intersectObjects([ saturn.whole ])
  if (intersectsSaturn) {
    toggleHula()
  }
  const [ intersectsText ] = raycaster.intersectObjects([ text ])
  if (intersectsText) {
    openYoutube()
  }
}

function onCanvasWheel(e) {
  state.freeCamera = true
}

function onCanvasMousedown(e) {
  state.freeCamera = true
}

function onCanvasMousemove(e) {
  e.preventDefault()
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1
  raycaster.setFromCamera(mouse, camera)
  const intersects = raycaster.intersectObjects([saturn.whole, text])
  document.body.classList.toggle('object-hover', intersects.length > 0)
}

function onCanvasTouchend() {
  const now = Date.now()
  const tapLength = now - state.lastTap
  const isDoubleTap = tapLength < 333 && tapLength > 0
  if (isDoubleTap) {
    onCanvasDoubleClick()
  }
  state.lastTap = now
}

function onKeydown(e) {
  if (e.code === 'Space') {
    toggleHula()
  } else if (e.code === 'Enter') {
    openYoutube()
  }
}

function init() {
  textureLoader = new THREE.TextureLoader()
  gltfLoader = new GLTFLoader()
  dracoLoader = new DRACOLoader()
  dracoLoader.setDecoderPath(DRACO_DECODER_PATH)
  gltfLoader.setDRACOLoader(dracoLoader)

  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x000000)

  raycaster = new THREE.Raycaster()
  mouse = new THREE.Vector2()

  camera = new THREE.PerspectiveCamera(
    5,
    window.innerWidth / window.innerHeight,
    10,
    10000
  )

  camera.position.x = 1200
  camera.position.y = 20
  camera.position.z = 0

  renderer = new THREE.WebGPURenderer({
    antialias: true
  })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.5

  const canvas = renderer.domElement
  document.body.appendChild(canvas)

  controls = new OrbitControls(camera, canvas)
  controls.minDistance = 600
  controls.maxDistance = 1800
  controls.enabled = true
  controls.enableDamping = true
  controls.minPolarAngle = PI / 4
  controls.maxPolarAngle = PI / 1.8

  frustum = new THREE.Frustum()
  cameraViewProjectionMatrix = new THREE.Matrix4()

  if (inspection.labels) {
    cssRenderer = new CSS3DRenderer()
    cssRenderer.setSize(
      window.innerWidth, window.innerHeight
    )
    cssRenderer.domElement.classList.add('css-scene')
    document.body.appendChild(cssRenderer.domElement)
    cssScene = new THREE.Scene()
  }

  light = addLight()
  sky = addSky()
  text = addText()
  saturn = addSaturn()
  cars = [].concat([
    ...carsConfig.outer.map(addOuterCar),
    ...carsConfig.inner.map(addInnerCar)
  ])

  if (inspection.fps) {
    stats = new Stats()
    document.body.appendChild(stats.dom)
  }

  if (inspection.loadingTimes) {
    inspectLoadingTimes()
  }

  Promise.all(cars.map(c => c.model)).then(() => {
    document.body.classList.add('loaded')
  })

  renderer.setAnimationLoop(animate)

  window.addEventListener('resize', onWindowResize)
  document.addEventListener('keydown', onKeydown)
  canvas.addEventListener('mousedown', onCanvasMousedown)
  canvas.addEventListener('wheel', onCanvasWheel)
  canvas.addEventListener('dblclick', onCanvasDoubleClick)
  canvas.addEventListener('touchend', onCanvasTouchend)
  canvas.addEventListener('mousemove', onCanvasMousemove)
}

init()
