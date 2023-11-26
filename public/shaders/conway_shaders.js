////////////////////////////////////////////////////////////////////////////////
//  (c) 2023, David 'Duppy' Proctor, Interface Arts
//
//  conway_shaders is an implementation of Conway's Game of Life in WebGL
//      contains vertex and fragment shaders as javascript string literals
////////////////////////////////////////////////////////////////////////////////

// define a null op glsl so that the glsl-literal vscode extension will highlight the syntax
const glsl = (x) => x // Wow. That's a cool trick! Backticks are more powerful than I knew!

export const vertex_shader_src = glsl`
    #ifdef GL_ES // GL_ES is defined if we're using WebGL
    // WebGL requires the mediump qualifier for precision in floats
    // Other versions of GLSL don't allow this qualifier
    precision mediump float;
    #endif

    attribute vec2 a_position;
    uniform float u_scale;
    uniform vec2 u_translation;

    void main() {
        vec2 position = a_position;

        position = u_scale*a_position + u_translation;

        gl_Position = vec4(position, 0.0, 1.0);
    }
` // end vertex_shader

export const fragment_shader_src = glsl`
    #ifdef GL_ES
    precision mediump float;
    #endif

    #define PI 3.1415926535897932384626433832795
    #define TAU (2.0*PI)

    uniform vec2 u_resolution;
    uniform float u_time;

    void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution;
        vec3 col = vec3(0.0);

        float _time = u_time/12.0;
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

export const default_frag_shader_src = glsl`
    #ifdef GL_ES
    precision mediump float;
    #endif

    uniform vec2 u_resolution;
    uniform float u_time;

    float checker(vec2 uv, float repeats) {
        float cx = floor(repeats * uv.x);
        float cy = floor(repeats * uv.y);
        float result = mod(cx + cy, 2.0);
        return sign(result);
    }

    void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution;

        vec3 ambient = vec3(0.1);
        vec3 direction = vec3(0.0, 1.0, 1.0);
        vec3 lightColor = vec3(length(uv)) / 1.5; // the 1.5 is arbitrary
        vec3 light = vec3(clamp(ambient + lightColor, 0.0, 1.0));

        vec3 color = vec3(1.0 * checker(uv, 4.0));
        gl_FragColor = vec4(color * light, 1.0);
    }

` // end default_frag_shader