//////////////////////////////////////////////////////////////////////
//  (c) 2023, David 'Duppy' Proctor, Interface Arts
//
//  render_sandbox
//      webgl_context
//////////////////////////////////////////////////////////////////////

// import { vertex_shader_src, fragment_shader_src as fragment_shader_src } from '/shaders/conway_shaders.js'
import { vertex_shader_src, default_frag_shader_src as fragment_shader_src } from '/shaders/conway_shaders.js'

// webgl_context
//  INPUT parent element
//  RETURN_canvas element that has a webgl context
export const webgl_context = (parent) => {
    //  use D3js to create an_canvas with webgl context in the parent element
    // https://observablehq.com/@mourner/webgl-2-boilerplate
    const zoom_target = parent
        .append('div')
        .style('height', '100%')
        .style('position', 'realtive')
    
    const canvas = zoom_target
        .append('canvas')
        .attr('width', zoom_target.node().clientWidth)
        .attr('height', zoom_target.node().clientHeight)
    
    const webgl_version = 'webgl2'
    const gl = canvas.node().getContext(webgl_version)
    if (!gl) {
        alert(`Your browser does not support ${webgl_version}.`)
        //return an empty d3.selection
        return d3.select()
    }

    // ...

    // Load a vertex shader from string literal vertex_shader_src
    const vertex_shader = gl.createShader(gl.VERTEX_SHADER)

    // Load a fragment shader from file /shaders/conway.frag
    const fragment_shader = gl.createShader(gl.FRAGMENT_SHADER)

    const program = gl.createProgram()

    gl.shaderSource(vertex_shader, vertex_shader_src)
    gl.compileShader(vertex_shader)
    if (!gl.getShaderParameter(vertex_shader, gl.COMPILE_STATUS)) {
        console.error(`WebGL vertex compile err: ${gl.getShaderInfoLog(vertex_shader)}`)
        return
    }

    gl.shaderSource(fragment_shader, fragment_shader_src)
    gl.compileShader(fragment_shader)
    if (!gl.getShaderParameter(fragment_shader, gl.COMPILE_STATUS)) {
        console.error(`WebGL frag compile err: ${gl.getShaderInfoLog(fragment_shader)}`)
        return
    }

    // Create a program and attach the shaders
    gl.attachShader(program, vertex_shader)
    gl.attachShader(program, fragment_shader)
    gl.linkProgram(program)

    // Check if the program was linked successfully
    console.log(`gl InfoLog:\n${gl.getProgramInfoLog(program)}`)
    console.log(`LINK_STATUS:\n${gl.getProgramParameter(program, gl.LINK_STATUS)}`)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        alert(gl.getProgramInfoLog(program))
        return
    }

    // set the clear color
    // pinky violet rose sort of color. This will make the background obvious if it peeks through.
    gl.clearColor(0.9, 0.4, 0.9, 1.0)
    // set depth buffer clear to default
    // gl.clearDepth(1.0)
    // clear both in one call
    // gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    gl.clear(gl.COLOR_BUFFER_BIT) // TEST: testing to see if we need to care about the depth buffer at all

    
    //  set the viewport to the canvas size
    gl.viewport(0, 0, canvas.node().clientWidth, canvas.node().clientHeight)
    console.log(`viewport: ${canvas.node().clientWidth} x ${canvas.node().clientHeight}`)

    // Use the program
    gl.useProgram(program)
    // Get the location of the uniform variable
    let uResolutionLocation = gl.getUniformLocation(program, 'u_resolution')

    // Set the value of the uniform variable
    let resolution = [canvas.node().clientWidth, canvas.node().clientHeight]
    gl.uniform2fv(uResolutionLocation, resolution)

    // Get the location of the uniform time variable
    let uTimeLocation = gl.getUniformLocation(program, 'u_time')

    // Create a buffer for the rectangle's vertices
    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(
        gl.ARRAY_BUFFER, 
        new Float32Array([
            -1.0, -1.0, 
                1.0, -1.0, 
                -1.0,  1.0, 
                1.0,  1.0
        ]), 
        gl.STATIC_DRAW
    )

    // Get the location of the a_position attribute
    const aPositionLocation = gl.getAttribLocation(program, 'a_position')

    // Enable the attribute
    gl.enableVertexAttribArray(aPositionLocation)
    
    // Tell the attribute how to get data out of the buffer
    gl.vertexAttribPointer(
        aPositionLocation,
        2,
        gl.FLOAT,
        false,
        0, //2 * Float32Array.BYTES_PER_ELEMENT, // TODO stride fixed, Copilot had stride as 0?
        0,
    )

    // Hook the Zoom drag and scale event handlers to the canvas
    function apply_zoom({ transform }) {
        // use parent zoom and drag units to transform the canvas element
        canvas.attr('transform', transform)
        // set attributes on the webgl context for the transform scale and translation
        //  scale
        const scale = transform.k
        //  translation
        const translation = [transform.x, -transform.y] // - on the y axis because the canvas is upside down from the DOM
        // set the scale global
        g_scale = scale
        // set the translation global
        g_translation[0] = translation[0] / g_width
        g_translation[1] = translation[1] / g_height
    }
    
    // get location of a_scale attribute
    let a_scale_location       = gl.getAttribLocation(program, 'a_scale')
    // get location of a_translation attribute
    let a_translation_location = gl.getAttribLocation(program, 'a_translation')
    
    // set the initial scale and translation
    let g_scale = 1.0
    let g_translation = [0.0, 0.0]

    // read the viewport size
    const viewport = gl.getParameter(gl.VIEWPORT)
    const g_width = viewport[2]
    const g_height = viewport[3]
    console.log(`viewport get: ${viewport}`)

    // hook the drag and zoom events to the parent
    zoom_target.call(d3.zoom()
        .scaleExtent([.25, 4])
        .on('zoom', apply_zoom)
    )

    // Draw the rectangle
    // THIS IS THE EVENT LOOP
    function draw() {
        // Set the value of the uniform time variable
        gl.uniform1f(uTimeLocation, performance.now() / 1000.0)
        // set the scale attribute
        gl.vertexAttrib1f(a_scale_location, g_scale)
        // set the translation attribute
        gl.vertexAttrib2fv(a_translation_location, g_translation)

        // Draw the scene
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

        // Schedule the next redraw
        requestAnimationFrame(draw)
    }    
    // Start the animation loop
    draw()

    //  return the context
    return gl
} // end webgl_context()
