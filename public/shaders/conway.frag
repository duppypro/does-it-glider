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

uniform vec2 u_resolution;
uniform float u_time;

void main() {
    vec2 uv = gl_FragCoord.xy / 600.0; // u_resolution;
    vec3 col = vec3(0.0);

    float _time = u_time;
    col.r = sin(uv.x * PI * sin(_time * 2.0*PI));
    col.g = sin(uv.y * PI * sin(_time * 2.0*PI));
    col.b = sin((uv.x + uv.y) * PI * sin(_time * 2.0*PI));

    gl_FragColor = vec4(col, 1.0);
}
