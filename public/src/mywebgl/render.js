//////////////////////////////////////////////////////////////////////
//  (c) 2023, David 'Duppy' Proctor, Interface Arts
//
//  render_sandbox
//      webgl_context
//////////////////////////////////////////////////////////////////////

// webgl_context
//  INPUT parent element
//  RETURN_canvas element that has a webgl context
export const webgl_context = (parent) => {
    //  use D3js to create an_canvas with webgl context in the parent element
    // https://observablehq.com/@mourner/webgl-2-boilerplate
    const zoom_target = parent
        .append('div')
        .attr('width', '100%')
        .attr('height', '100%')
        .style('position', 'realtive')
    
    const canvas = zoom_target
        .append('canvas')
        .attr('width', 800)
        .attr('height', 600)
    
    const webgl_version = 'webgl2'
    const gl = canvas.node().getContext(webgl_version)
    if (!gl) {
        alert(`Your browser does not support ${webgl_version}.`)
        //return an empty d3.selection
        return d3.select()
    }

    // ...

    // Load a vertex shader from file /shaders/vertexShader.vert
    const vertex_shader = gl.createShader(gl.VERTEX_SHADER);

    // Load a fragment shader from file /shaders/conway.frag
    const fragment_shader = gl.createShader(gl.FRAGMENT_SHADER);

    const program = gl.createProgram();
    fetch('/shaders/conway.vert')
        .then(response => response.text())
        .then(data => {
            gl.shaderSource(vertex_shader, data);
            gl.compileShader(vertex_shader);
            if (!gl.getShaderParameter(vertex_shader, gl.COMPILE_STATUS)) {
                alert(gl.getShaderInfoLog(vertex_shader));
                return;
            }

            (fetch('/shaders/conway.frag')
                .then(response => response.text())
                .then(data => {
                    gl.shaderSource(fragment_shader, data);
                    gl.compileShader(fragment_shader);
                    if (!gl.getShaderParameter(fragment_shader, gl.COMPILE_STATUS)) {
                        alert(gl.getShaderInfoLog(fragment_shader));
                        return;
                    }

                    // Create a program and attach the shaders
                    gl.attachShader(program, vertex_shader);
                    gl.attachShader(program, fragment_shader);
                    gl.linkProgram(program);

                    // Check if the program was linked successfully
                    console.log(`gl InfoLog:\n${gl.getProgramInfoLog(program)}`);
                    console.log(`LINK_STATUS:\n${gl.getProgramParameter(program, gl.LINK_STATUS)}`);
                    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
                        alert(gl.getProgramInfoLog(program));
                        return;
                    }

                    // set the clear color
                    gl.clearColor(0.9, 0.4, 0.9, 1.0)
                    // clear the color buffer and depth buffer
                    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
                    
                    //  set the viewport to the canvas size
                    gl.viewport(0, 0, canvas.node().clientWidth, canvas.node().clientHeight)
                    console.log(`viewport: ${canvas.node().clientWidth} x ${canvas.node().clientHeight}`)

                    // Use the program
                    gl.useProgram(program);
                    // Get the location of the uniform variable
                    let uResolutionLocation = gl.getUniformLocation(program, 'u_resolution')
                
                    // Set the value of the uniform variable
                    let resolution = [canvas.width, canvas.height]
                    gl.uniform2fv(uResolutionLocation, resolution)
                
                    // Get the location of the uniform time variable
                    let uTimeLocation = gl.getUniformLocation(program, 'u_time')
                
                    // Create a buffer for the rectangle's vertices
                    const buffer = gl.createBuffer();
                    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
                    gl.bufferData(
                        gl.ARRAY_BUFFER, 
                        new Float32Array([
                            -0.75, -0.75, 
                             0.75, -0.75, 
                             -0.75,  0.75, 
                             0.75,  0.75
                        ]), 
                        gl.STATIC_DRAW
                    );

                    // Get the location of the a_position attribute
                    const aPositionLocation = gl.getAttribLocation(program, 'a_position');

                    // Enable the attribute
                    gl.enableVertexAttribArray(aPositionLocation);
                    
                    // Tell the attribute how to get data out of the buffer
                    gl.vertexAttribPointer(
                        aPositionLocation,
                        2,
                        gl.FLOAT,
                        false,
                        2 * Float32Array.BYTES_PER_ELEMENT, // stride fixed, Copilot had stride as 0?
                        0,
                    );

                    // Draw the rectangle
                    function draw() {
                        // Set the value of the uniform time variable
                        gl.uniform1f(uTimeLocation, performance.now() / 1000.0)
                
                        // Draw the scene
                        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

                        // Schedule the next redraw
                        requestAnimationFrame(draw);
                    }
                    // Start the animation loop
                    draw();
                })
                .catch(error => console.error(error))
            ) // end fetch fragment_shader    
        })
        .catch(error => console.error(error));

    // ...


    function apply_zoom({ transform }) {
        // use parent zoom and drag units to transform the canvas element
        canvas.attr('transform', transform)
    }

    // hook the drag and zoom events to the parent
    zoom_target.call(d3.zoom()
        .scaleExtent([.25, 4])
        .on('zoom', apply_zoom)
    )

    //  return the context
    return gl
} // end webgl_context()
