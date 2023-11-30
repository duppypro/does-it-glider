//////////////////////////////////////////////////////////////////////
//  (c) 2023, David 'Duppy' Proctor, Interface Arts
//
//  render_sandbox
//      webgl_context
//////////////////////////////////////////////////////////////////////

import { mat2d, vec2 } from '/node_modules/gl-matrix/esm/index.js'

import {
    vertex_shader_src,
    checker_frag_shader_src, // may enable as fragment_shader_src for testing
    rainbow_fragment_shader_src, // may enable as fragment_shader_src for testing
    grid_frag_shader_src as fragment_shader_src, // may enable as fragment_shader_src for
    // conway_frag_shader_src as fragment_shader_src, // the real Conway's Game of Life
} from '/src/conway/shaders.js'

import { settings } from '/src/does-it-glider/settings.js'

// webgl_context
//  INPUT parent element
//  RETURN a webgl context
export const webgl_context = (parent) => {
    //  use D3js to create a canvas with webgl context in the parent element
    // https://observablehq.com/@mourner/webgl-2-boilerplate
    // get the width and height of the parent element
    const p_w = parent.node().clientWidth
    const p_h = parent.node().clientHeight
    const cell_px = settings.CELL_PX
    const gw = settings.GRID_WIDTH * cell_px // num cells * px/cell -> num pixels
    const gh = settings.GRID_HEIGHT * cell_px
    
    //BUGBUG #4 render does not respond to resize events

    // set parent to rare background color to help debug if canvas is not covering entire parent
    parent.style('background', '#654321')
    // calculate left and top offsets to center the canvas
    const G_PAD_LEFT = (gw - p_w) / 2
    const G_PAD_TOP = (gh - p_h) / 2
    const canvas = parent
        .append('canvas')
        .attr('width', gw)
        .attr('height', gh)
        .style('position', 'absolute')
        .style('left', `${-G_PAD_LEFT}px`)
        .style('top', `${-G_PAD_TOP}px`)
        .attr('transform', `translate(${-G_PAD_LEFT}, ${-G_PAD_TOP})`)
        .style('background', '#123456') // rare color to help debug if shader is not rendering entire canvas

    const webgl_version = 'webgl2'
    const gl = canvas.node().getContext(webgl_version)
    if (!gl) {
        console.error(`Your browser does not support ${webgl_version}.`)
        let parent = d3.select(canvas.node().parentNode.parentNode)
        parent.html(`Your browser does not support ${webgl_version}.<br>Please try a different browser.`)
        parent
            .style('padding', '1em')
            .style('font-size', '2em')
        //return an empty d3.selection
        return d3.select()
    }

    // Compile a vertex shader from string literal vertex_shader_src
    const vertex_shader = gl.createShader(gl.VERTEX_SHADER)
    gl.shaderSource(vertex_shader, vertex_shader_src)
    gl.compileShader(vertex_shader)
    if (!gl.getShaderParameter(vertex_shader, gl.COMPILE_STATUS)) {
        console.error(`WebGL vertex compile err: ${gl.getShaderInfoLog(vertex_shader)}`)
        return
    }
    // Compile a fragment shader from string literal fragment_shader_src
    const fragment_shader = gl.createShader(gl.FRAGMENT_SHADER)
    gl.shaderSource(fragment_shader, fragment_shader_src)
    gl.compileShader(fragment_shader)
    if (!gl.getShaderParameter(fragment_shader, gl.COMPILE_STATUS)) {
        console.error(`WebGL frag compile err: ${gl.getShaderInfoLog(fragment_shader)}`)
        return
    }
    
    // Create a program and attach the shaders
    const program = gl.createProgram()
    gl.attachShader(program, vertex_shader)
    gl.attachShader(program, fragment_shader)
    gl.linkProgram(program)
    // Check if the program was linked successfully
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(program))
        return
    }

    //  set the viewport to the canvas size
    gl.viewport(0, 0, gw, gh)

    // Use the program
    gl.useProgram(program)
    // Get the location of the uniform variable
    let uResolutionLocation = gl.getUniformLocation(program, 'u_resolution')

    // Set the value of the uniform variable
    let resolution = [gw, gh]
    gl.uniform2fv(uResolutionLocation, resolution)

    // Get the location of the uniform tick variable
    let uTickLocation = gl.getUniformLocation(program, 'u_tick')

    // Create a buffer for the rectangle's vertices
    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(
        gl.ARRAY_BUFFER,
        // make a rectangle from 2 triangles
        new Float32Array([
            -1.0, -1.0,        0.0, gh, // lower left in clip space is 0, 1 in grid space
            +1.0, -1.0, gw, gh, // lower right in clip space is 1, 1 in grid space
            -1.0, +1.0,        0.0,         0.0, // upper left in clip space is 0, 0 in grid space
            +1.0, +1.0, gw,         0.0, // upper right in clip space is 1, 0 in grid space
        ]), 
        gl.STATIC_DRAW
    )

    // Get the location of the a_position attribute
    const aPositionLocation = gl.getAttribLocation(program, 'a_position')
    const aGridCoordLoc = gl.getAttribLocation(program, 'a_gridCoord')

    // Enable the attribute
    gl.enableVertexAttribArray(aPositionLocation)
    gl.enableVertexAttribArray(aGridCoordLoc)

    // Tell the attribute how to get data out of the buffer
    gl.vertexAttribPointer(
        aPositionLocation,
        2,
        gl.FLOAT,
        false,
        4 * Float32Array.BYTES_PER_ELEMENT,
        0,
    )
    gl.vertexAttribPointer(
        aGridCoordLoc,
        2,
        gl.FLOAT,
        false,
        4 * Float32Array.BYTES_PER_ELEMENT,
        2 * Float32Array.BYTES_PER_ELEMENT,
    )

    // Get the location of the uniform variable
    let uScaleLocation = gl.getUniformLocation(program, 'u_scale')
    let uTranslationLocation = gl.getUniformLocation(program, 'u_translation')

    // create functions to map DOM coords to gl coords
    const map_DOM_to_gl_x = d3.scaleLinear().domain([0, gw]).range([-1, 1])
    const map_DOM_to_gl_y = d3.scaleLinear().domain([0, gh]).range([1, -1])

    // set the initial scale and translation
    let gl_scale = 1.0
    let gl_translation = [0.0, 0.0]

    // hook the pan and zoom events to the parent
    // and apply pan and to the canvas
    function apply_zoom({ transform }) {
        // use parent zoom and drag units to transform the canvas element
        // only for debugging, canvas doesn't transform. use vertex shader 
        canvas.attr('transform', transform)
        // set the scale global that draw will pass
        gl_scale = transform.k // scale is same for all coords and centers of zoom and drag

        // map transform's translation to gl_translation coord space
        gl_translation = [
            map_DOM_to_gl_x(transform.x),
            map_DOM_to_gl_y(transform.y),
        ]

        // move gl coords relative to WebGL viewport center scaled by gl_scale
        gl_translation[0] += gl_scale
        gl_translation[1] -= gl_scale
    }

    canvas.call(d3.zoom()
        .scaleExtent([1/cell_px, 4])
        .on('zoom', apply_zoom)
    )

    // Draw the rectangle
    // THIS IS THE EVENT LOOP
    function draw() {
        // assume requestAnimationFrame is called 60 times per second
        // 2^53 / 60 / 60 / 60 / 24 / 365 = 4,760,274 years
        // 60fps is too fast. Only aplply the rules and draw some of the time.
        if (tick % 2 == 0) { // every 20 frames is 1/3 of a second, so 3 fps
            // TODO #7 add smart pause that does not redraw if no game state change and no window resize or zoom
            if (tick == 0) {
                // do some init on the first frame if needed
                console.log('first frame')
                // clear the gl background
                gl.clearColor(5, 0, 3, 1)
                gl.clear(gl.COLOR_BUFFER_BIT)
            }
            // Set the value of the uniform tick variable
            gl.uniform1f(uTickLocation, tick)
            // this should more precisely be the time that it will be when the next AnimationFrame is called and renders
            // unless I just use tick for frame number.  Conway doesn't need precise timing. It's not a game.
            // set the scale and translation for the vertex shader
            gl.uniform1f(uScaleLocation, gl_scale)
            gl.uniform2fv(uTranslationLocation, gl_translation)
            // Draw the scene. In this case TRIANGLE_STRIP is just 2 triangles that make a rectangle.
            // This is the minimum way to draw a rectangle in WebGL.
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
        }
        tick++
        requestAnimationFrame(draw)
    }
    let tick = 0
    draw()

    //  return the context
    return gl
} // end webgl_context()
