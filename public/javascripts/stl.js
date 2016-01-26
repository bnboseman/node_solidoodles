function createViewer(container, width, height) {
  container = container || document.body
  var camera, scene, renderer, geometry, material, mesh, pointLight, vs, controls,  reflectCamera

  var orgX,orgY

  var move = false
  var wire = false
  
  load()
  
  return {
    readStl: function(stl) {
      buildGeometry(stl, {name: 'file.stl'})
    },
    readObj: function(obj) {
      buildGeometry(obj, {name: 'file.obj'})
    },
    getRender: function() {
    	return renderer
    },
    toggleControls: function(status) {
  	  controls.enabled =  status
    }
  }
  
  
  
  function init() {
	var backgroundcolor = 0xfbfafb
    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 10000)
    camera.position.z = 500
    camera.up = new THREE.Vector3( 0, 1, 0)
    camera.lookAt( new THREE.Vector3(0,0,0) )
    
   
    scene = new THREE.Scene()
    scene.fog = new THREE.Fog(backgroundcolor, 10, 5000)

    scene.add(camera)
    
    reflectCamera = new THREE.CubeCamera( 0.1, 10000);
    scene.add( reflectCamera );
    
    materials = [new THREE.MeshPhongMaterial({color: 0xA6ce39, ambient: 0x154800, specular: 0x444444, shininess: 7, refractionRatio: 1.46, wrapAround: true})]

    var pointLight = new THREE.PointLight(0xFFFFFF)
    var keyLight = new THREE.DirectionalLight(0xffffff);
    keyLight.intensity = .9;
    keyLight.position.set(500, 140, 500);
    keyLight.castShadow = true;
    keyLight.shadowMapHeight =  2048
    keyLight.shadowMapWidth = 2048
    keyLight.shadowDarkness = .15
    var spotLight = new THREE.PointLight( 0xffffff );
    spotLight.intensity = .5
    spotLight.position.set( -500, 140, -500 );
    camera.add( spotLight)
  
    camera.add(keyLight);
    
    if ("WebGLRenderingContext" in window) renderer = new THREE.WebGLRenderer( { antialias: true, preserveDrawingBuffer: true } )
    else renderer = new THREE.CanvasRenderer()

    renderer.setSize( width, height )
    renderer.shadowMapEnabled = true
    renderer.shadowMapType = THREE.PCFShadowMap
    renderer.shadowMapSoft = true
    renderer.setClearColor( backgroundcolor, 0);
    
     controls = new THREE.OrbitControls( camera, renderer.domElement )
	controls.rotateSpeed = 2.0
	controls.zoomSpeed = 1.2
	controls.panSpeed = 0.8
	controls.noZoom = false
	controls.noPan = false
	controls.staticMoving = true
	controls.dynamicDampingFactor = 0.1
	controls.keys = [65, 83, 68]
	controls.addEventListener( 'change',  render)
    container.appendChild( renderer.domElement )
  }
  
  function animate() {
    setTimeout( function() {
        requestAnimationFrame( animate );
    }, 1000  );
    render()
    controls.update()
  }
  
  function render() {
    renderer.render( scene, camera )
  }
  
  function dragenter(e) {
    e.stopPropagation()
    e.preventDefault()
  }
  
  function dragover(e) {
    e.stopPropagation()
    e.preventDefault()
  }
  
  function drop(e) {
     e.stopPropagation()
     e.preventDefault()

     var dt = e.dataTransfer
     var files = dt.files

     handleFiles(files)
  }
   
  function readObj(oFile, vs, fs) {
    var l = oFile.split(/[\r\n]/g);

    for (var i=0; i < l.length; i++) {
      var ls = l[i].trim().split(/\s+/)
      if (ls[0] == "v") {
        var v = new THREE.Vector3(parseFloat(ls[1]) * 100, parseFloat(ls[2]) * 100, parseFloat(ls[3]) * 100)
        vs.push(v)
      }
      if (ls[0] === "f") {
        var f = new THREE.Face3(parseFloat(ls[1]) - 1, parseFloat(ls[2]) - 1, parseFloat(ls[3]) - 1)
        fs.push(f)
      }
    }
  }
  
  function readAsciiStl(l, vs, fs) {
    var solid = false
    var face = false
    var vis = []
    vtest = {}
    
    for(var i=0; i < l.length; i++) {
      var line = l[i]
      if (solid) {
        if (line.search("endsolid") > -1) solid = false
        else if(face) {
          if (line.search("endfacet") > -1) {
            face = false
            var f = new THREE.Face3(vis[0], vis[1], vis[2])
            fs.push(f)
          } else if (line.search("vertex") > -1) {
            var cs = line.substr(line.search("vertex") + 7)
            cs = cs.trim()
            var ls = cs.split(/\s+/)
            var v = new THREE.Vector3(parseFloat(ls[0]), parseFloat(ls[1]), parseFloat(ls[2]))
            var vi = vs.length
            if (cs in vtest) {
              vi = vtest[cs]
            } else {
              vs.push(v)
              vtest[cs] = vi
            }
            vis.push(vi)
          }
        }
        else {
          if (line.search("facet normal") > -1) {
            face = true
            vis = []
          }
        }
      }
      else {
        if (line.search("solid")> - 1) solid = true
      }
    }
    vtest = null
  }
  
  function triangle() {
    if (arguments.length == 2) {
      this._buffer = arguments[0]
      this._sa = arguments[1]
    } else {
      this._sa = 0
      this._buffer = new ArrayBuffer(50)
    }
    this.__byte = new Uint8Array(this._buffer)
    this.normal = new Float32Array(this._buffer, this._sa + 0, 3)
    this.v1 = new Float32Array(this._buffer, this._sa + 12, 3)
    this.v2 = new Float32Array(this._buffer, this._sa + 24, 3)
    this.v3 = new Float32Array(this._buffer, this._sa + 36, 3)
    var _attr = new Int16Array(this._buffer, this._sa + 48, 1)
    Object.defineProperty(this, "attr", {
      get: function(){
        return _attr[0]
      },
      set: function(val) {
        _attr[0] = val
      },
      enumerable: true
    })
  }
  
  function readBinaryStl(l, vs, fs) {
    var buf = new ArrayBuffer(l.length)
    var bbuf = new Uint8Array(buf)
    for (var i = 0; i < l.length; i++) bbuf[i] = l.charCodeAt(i)
    var trnr = new Uint32Array(buf, 80, 1)
    var vis = [0, 0, 0]
    var vtest = {}
    var offset = 84
    var face = new triangle()
    for (var i = 0; i < trnr[0]; i++) {
      for (var j = 0; j < 50; j++) face.__byte[j] = bbuf[offset + j]
      var v = new THREE.Vector3(face.v1[0], face.v1[1], face.v1[2])
      var k = "" + face.v1[0] + "," + face.v1[1] + "," + face.v1[2]
      vis[0] = vs.length
      if (k in vtest) vis[0] = vtest[k]
      else {
        vs.push(v)
        vtest[k] = vis[0]
      }

      v = new THREE.Vector3(face.v2[0], face.v2[1], face.v2[2])
      k = "" + face.v2[0] + "," + face.v2[1] + "," + face.v2[2]
      vis[1] = vs.length
      if (k in vtest) vis[1] = vtest[k]
      else {
        vs.push(v)
        vtest[k] = vis[1]
      }

      v = new THREE.Vector3(face.v3[0], face.v3[1], face.v3[2])
      k = "" + face.v3[0] + "," + face.v3[1] + "," + face.v3[2]
      vis[2] = vs.length
      if (k in vtest) vis[2] = vtest[k]
      else {
        vs.push(v)
        vtest[k] = vis[2]
      }

      var normal = new THREE.Vector3( face.normal[0], face.normal[1], face.normal[2] )
      var f = new THREE.Face3(vis[0], vis[1], vis[2], normal)
      fs.push(f)

      offset += 50
    }
    vtest = null
    delete bbuf
    delete buf
    buf = null
  }	
  
  function readStl(oFile, vs, fs) {
	if (oFile instanceof ArrayBuffer) return arrayBufferToBinaryString(oFile, function(stl) {
      readBinaryStl(stl, vs, fs)
    })
    var solididx = oFile.search("solid")
    if (solididx > -1 && solididx < 10) {
      var l = oFile.split(/[\r\n]/g)
      readAsciiStl(l, vs, fs)
      if(fs.length == 0) readBinaryStl(oFile, vs, fs)
    } else { 
      readBinaryStl(oFile, vs, fs)
    }
  }
  
  function buildGeometry(l, f) {
    var vs = []
    var fs = []
    if (f.name.indexOf(".obj") > -1) readObj(l, vs, fs)
    else if (f.name.indexOf(".stl") > -1) readStl(l, vs, fs)
    else return
    
    for (var i in fs) {
      var v0 = vs[fs[i].a]
      var v1 = vs[fs[i].b]
      var v2 = vs[fs[i].c]
      var e1 = new THREE.Vector3(v1.x - v0.x, v1.y - v0.y, v1.z - v0.z)
      var e2 = new THREE.Vector3(v2.x - v0.x, v2.y - v0.y, v2.z - v0.z)
      var n = new THREE.Vector3(e1.y * e2.z - e1.z * e2.y, e1.z * e2.x - e1.x * e2.z, e1.x * e2.y - e1.y * e2.x);
      var l = Math.sqrt(n.x * n.x + n.y * n.y + n.z * n.z)
      n.x /= l
      n.y /= l
      n.z /= l
      fs[i].normal = n
    }
    var mx = 1e10, my = 1e10, mz = 1e10
    var Mx = -1e10, My = -1e10, Mz = -1e10
    for (var i in vs) {
      if (mx > vs[i].x) mx = vs[i].x
      if (my > vs[i].y) my = vs[i].y
      if (mz > vs[i].z) mz = vs[i].z
      if (Mx < vs[i].x) Mx = vs[i].x
      if (My < vs[i].y) My = vs[i].y
      if (Mz < vs[i].z) Mz = vs[i].z
    }
    var max = Math.max(Mx - mx, My - my, Mz - mz)
    var height = My - my
    max /= 200
    var cx = (Mx + mx) / 2
    var cy = (My + my) / 2
    var cz = (Mz + mz) / 2
    for (var i in vs) {
      vs[i].x -= cx
      vs[i].y -= cy
      vs[i].z -= cz
      vs[i].x /= max
      vs[i].y /= max
      vs[i].z /= max
    }
    var mx = 1e10, my = 1e10, mz = 1e10
    var Mx = -1e10, My = -1e10, Mz = -1e10
    for (var i in vs) {
      if (mx > vs[i].x) mx = vs[i].x
      if (my > vs[i].y) my = vs[i].y
      if (mz > vs[i].z) mz = vs[i].z
      if (Mx < vs[i].x) Mx = vs[i].x
      if (My < vs[i].y) My = vs[i].y
      if (Mz < vs[i].z) Mz = vs[i].z
    }
    geometry = new THREE.Geometry()
    geometry.vertices = vs
    geometry.faces = fs
    if (mesh) scene.remove( mesh )
  
    
    //geometry.computeVertexNormals()
   geometry.computeFaceNormals () 
   geometry.computeMorphNormals
   //geometry.computeVertexNormals ()
    
    mesh = new THREE.Mesh( geometry, new THREE.MeshFaceMaterial(materials) )
    mesh.receiveShadow = true
    mesh.castShadow = true
    mesh.rotation.x = -(Math.PI / 2)
    console.log( mesh )
    scene.add( mesh )
    render()

   grid = new THREE.GridHelper( 10000, 100 )
    grid.position.y = mz
    scene.add( grid )
    plane = new THREE.PlaneBufferGeometry(10000, 10000, 10)
    planeMaterial = new THREE.MeshPhongMaterial( {color: 0xcccccc, emissive: 0x303030, refractionRatio: .1, shininess: 10, wrapAround: true} )
    meshPlane = new THREE.Mesh( plane, planeMaterial )
    meshPlane.receiveShadow = true
    meshPlane.rotation.x = -(Math.PI / 2)
    meshPlane.position.y = mz
    scene.add( meshPlane )
    controls.maxDistance = mesh.geometry.boundingSphere.radius * 5
    controls.minDistance = mesh.geometry.boundingSphere.radius * 1.1
  }

  function handleFiles(f) {
    var reader = new FileReader();
    reader.onload = function(e) {
      var oFile = e.target.result
      buildGeometry(oFile, f[0])
    }
    var file = f[0]
    reader.readAsBinaryString(file)
  }
  
  function arrayBufferToBinaryString(buf, callback) {
    var blob = new Blob([buf])
    var f = new FileReader()
    f.onload = function(e) {
      callback(e.target.result)
    }
    f.readAsBinaryString(blob)
  }

  function example(file) {
    var xhr = new XMLHttpRequest()
    xhr.open('GET',  file, true)
    xhr.onload  = function() {
      document.getElementById("centered").style.display = 'none'
      var oFile = this.response
      f = {}
      f.name = file
      buildGeometry(oFile, f)
    }
    xhr.send("")
  }

  function load() {
    init()
     animate()
    if (window.File && window.FileReader && window.FileList && window.Blob) {
      // Great success! All the File APIs are supported.
      container.addEventListener("dragenter", dragenter, false)
      container.addEventListener("dragover", dragover, false) 
      container.addEventListener("drop", drop, false)
    } else {
      alert("The File API is needed for this application! Your browser is not supported!")
    }
  }
}
