////////////////////////////////////////////////////////////////////////////////
//  (c) 2023, David 'Duppy' Proctor, Interface Arts
//
//  conway.frag is an implementation of Conway's Game of Life in WebGL
//      fragment shader
////////////////////////////////////////////////////////////////////////////////

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

    col = col * 0.33 + 0.4; // normalize

    col = vec3(0.6);


    gl_FragColor = vec4(col, 1.0);
}
