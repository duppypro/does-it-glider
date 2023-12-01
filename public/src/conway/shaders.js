////////////////////////////////////////////////////////////////////////////////
//  (c) 2023, David 'Duppy' Proctor, Interface Arts
//
//  conway_shaders is an implementation of Conway's Game of Life in WebGL
//      contains vertex and fragment shaders as javascript string literals
////////////////////////////////////////////////////////////////////////////////

import { settings } from '/src/does-it-glider/settings.js'

// define a null op glsl so that the glsl-literal vscode extension will highlight the syntax
const glsl = (x) => x+'' // HACK force glsl to return a string so we can use .replace()

const cell_w = `${settings.CELL_PX.toFixed(3)}`
const cell_h = `${settings.CELL_PX.toFixed(3)}`
const border = `${settings.BORDER_PX.toFixed(3)}`
const epsilon = `${0.000001.toFixed(9)}`

export const vertex_shader_src = glsl`
    precision mediump float;
    // in
    attribute vec2 a_position, a_gridCoord;
    uniform float u_scale;
    uniform vec2 u_translation;
    // out
    varying vec2 v_gridCoord;

    void main() {
        // in u_scale and u_translation from app pan+zoom feature
        vec2 zoomed = (u_scale * a_position) + u_translation;
        // out
        gl_Position = vec4(zoomed, 0.0, 1.0);
        v_gridCoord = a_gridCoord;
    }
` // end vertex_shader_src

export const grid_frag_shader_src = glsl`
    precision mediump float;
    // in
    uniform float u_tick;
    varying vec2 v_gridCoord; // take advantage of interpolation instead of undoing the scale+translation

    float is_border(vec2 uv) {
        float cx = floor(0.5 + mod(uv.x, __cell_w));
        float cy = floor(0.5 + mod(uv.y, __cell_h));
        // BUG #6 this is incorrectly false at the intersection of the grid lines
        float result = sign(cx - __border - __epsilon)
                     * sign(cy - __border - __epsilon);
        // result is -1.0 for the first border pixels and +1 for the background
        // subtracting epsilon makes the sign() certain to be -1.0 not 0.0
        // convert to 1.0 for border pixels and 0.0 for background
        result = sign(1.0 - result);
        return result;
    }

    void main() {
        vec3 color;
        float if_border = sign(is_border(v_gridCoord));
        float if_background = sign(1.0 - if_border);
        color = if_background * vec3(1.0/16.0); // color of background
        color += if_border * vec3(6.0/16.0); // color of border
        gl_FragColor = vec4(color, 1.0);
    }
`
// ??? I wasn't able to get literal expansion working
// ??? because maybe cell_w is not in glsl context
// ??? it is replacing __cell_w with '' instead of the expected '16.000'
// ??? this isn't really a language issue, it's the glsl formatting extension
// ??? it's looking for "glsl`" specifcally and not glsl('shader source code')
.replace(/\b__cell_w\b/ug, cell_w)
.replace(/\b__cell_h\b/ug, cell_h)
.replace(/\b__border\b/ug, border)
.replace(/\b__epsilon\b/ug, epsilon)
// end grid_frag_shader_src

export const rainbow_fragment_shader_src = glsl`
    precision mediump float;

    #define PI (3.1415926535897932384626433832795)
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

        float _time = ((1.0 /_fps) * u_tick); // convert frame count to seconds
        // therefore sin(freq * TAU * _time) is a sin wave with frequency 'freq' in Hz
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
        float cx = floor(0.5 + repeats * uv.x);
        float cy = floor(0.5 + repeats * uv.y);
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

