////////////////////////////////////////////////////////////////////////////////
//  (c) 2023, David 'Duppy' Proctor, Interface Arts
//
//  conway_shaders is an implementation of Conway's Game of Life in WebGL
//      contains vertex and fragment shaders as javascript string literals
////////////////////////////////////////////////////////////////////////////////

// define a null op glsl so that the glsl-literal vscode extension will highlight the syntax
const glsl = (x) => x

export const vertex_shader_src = glsl`
    precision mediump float;

    attribute vec2 a_position;
    attribute vec2 a_gridCoord;
    uniform float u_scale;
    uniform vec2 u_translation;

    // send a pan and zoom scale and translation to the fragment shader
    varying vec2 v_gridCoord;

    void main() {
        vec2 zoomed = u_scale*a_position + u_translation;

        gl_Position = vec4(zoomed, 0.0, 1.0);

        // pass in clip space [-1,-1  1, 1] to fragment shader
        // send inverse scale and translation to fragment shader
        // TODO why don't we just send the scale and translation as uniforms to the fragment shader?
        v_gridCoord = a_gridCoord;
    }
` // end vertex_shader

export const rainbow_fragment_shader_src = glsl`
    precision mediump float;

    #define PI 3.1415926535897932384626433832795
    #define TAU (2.0*PI)

    uniform vec2 u_resolution;
    uniform float u_tick;

    // receive the zoom info from the vertex shader
    varying float v_scale;
    varying vec2 v_translation;

    void main() {
        vec2 frag_coord = gl_FragCoord.xy / u_resolution;
        // shift origin to center of screen
        frag_coord = 2.0*frag_coord - 1.0;
        // scale and translate
        vec2 uv = v_scale * (frag_coord + v_translation);
        // shift back to lower left
        uv = (uv + 1.0) / 2.0;
        vec3 col = vec3(0.0);

        float _time = ((1.0/60.0) * u_tick) / 24.0; // convert 60fps frame count to seconds
        float rotation = 2.17 * _time;
        rotation = rotation + TAU*sin(_time*1.0*TAU);

        // rotate uv slowly over time
        vec2 _uv = vec2(
            uv.x*cos(rotation) - uv.y*sin(rotation),
            uv.x*sin(rotation) + uv.y*cos(rotation)
        );    

        col.r = sin(0.57*TAU * _uv.x * sin(_time * 2.0*TAU));
        col.g = cos(0.47*TAU * _uv.y * sin(_time * 2.1*TAU));
        col.b = sin(length(_uv)*0.5 * 1.0*TAU * sin(_time * 1.0*TAU));

        gl_FragColor = vec4(col, 1.0);
    }    
` // end fragment_shader

export const checker_frag_shader_src = glsl`
    precision mediump float;

    uniform vec2 u_resolution;
    uniform float u_tick;

    // receive the zoom info from the vertex shader
    varying float v_scale;
    varying vec2 v_translation;
    varying vec2 v_gridCoord; // take advantage of interpolation instead of undoing the scale+translation

    float checker(vec2 uv, float repeats) {
        float cx = floor(repeats * uv.x);
        float cy = floor(repeats * uv.y);
        float result = mod(cx + cy, 2.0);
        return sign(result);
    }

    void main() {
        vec2 frag_coord = gl_FragCoord.xy / u_resolution;
        // shift origin to center of screen
        frag_coord = 2.0*frag_coord - 1.0;
        // scale and translate
        vec2 uv = v_scale * (frag_coord + v_translation);
        // shift back to lower left
        uv = v_gridCoord;
        uv = (uv + 1.0) / 2.0;


        vec3 ambient = vec3(0.04);
        vec3 direction = vec3(0.0, 1.0, 1.0);
        vec3 lightColor = vec3(length(uv)) / 1.25; // the 1.5 is arbitrary
        vec3 light = vec3(clamp(ambient + lightColor, 0.0, 1.0));

        vec3 color = vec3(1.0 * checker(uv, 128.0));
        gl_FragColor = vec4(color * light, 1.0);
        // gl_FragColor = vec4(sign(uv.x-0.5), 0.0, sign(uv.y-0.5), 1.0);
    }
` // end checker_frag_shader_src

export const grid_frag_shader_src = glsl`
    precision mediump float;

    uniform vec2 u_resolution;
    uniform float u_tick;

    // receive the zoom info from the vertex shader
    varying vec2 v_gridCoord; // take advantage of interpolation instead of undoing the scale+translation

    float is_border(vec2 uv) {
        float cx = mod(floor(uv.x), 20.0); // TODO move this to a uniform variable
        float cy = mod(floor(uv.y), 20.0);
        float result = sign(cx-1.001) * sign(cy-1.001); // BUG #6 this is false at the intersection of the grid lines
        return (1.0 - sign(result)) / 2.0;
    }

    void main() {
        // don't need traditional gl_FragCoord.xy / u_resolution;
        // because we are using the v_gridCoord from the vertex shader
        // shift origin to center of screen

        vec3 color = vec3(1.0/16.0) + is_border(v_gridCoord)*(5.0/16.0);
        gl_FragColor = vec4(color, 1.0);
    }
` // end grid_frag_shader_src